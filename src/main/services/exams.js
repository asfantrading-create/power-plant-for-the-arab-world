'use strict';
/** Exam templates, attempts, grading and result statistics. */
const { Store } = require('./store');
const gen = require('./question-generator');

const DEFAULT_EXAM = {
  title: '', titleAr: '', description: '',
  topics: ['general'],            // question-bank topics; [] = all topics
  questionCount: 20,
  generatedShare: 0.4,            // fraction of questions generated from real plant data
  plantScope: { countries: [], technologies: [] },
  durationMinutes: 30,
  passMark: 60,
  maxAttempts: 2,
  assignedGroups: [],             // [] = every student
  showAnswers: true,
  shuffle: true,
  active: true,
  kind: 'exam',                   // 'exam' | 'practice'
};

function sanitizeQuestion(q) {
  const { correct, explanation, ...rest } = q;
  return rest;
}

class Exams {
  constructor(store, bank, dataset) {
    this.store = store;
    this.bank = bank;       // {topics, questions}
    this.dataset = dataset; // {plants, countries, technologies}
  }

  list() { return this.store.list('exams'); }
  get(id) { return this.store.get('exams', id); }

  listForUser(user) {
    const all = this.list().filter(e => e.active !== false && e.kind !== 'practice');
    if (user.role !== 'student') return all;
    return all.filter(e => !e.assignedGroups?.length || (user.groupId && e.assignedGroups.includes(user.groupId)));
  }

  create(input, createdBy) {
    const exam = { ...DEFAULT_EXAM, ...input, id: Store.newId('ex-'), createdBy, plantScope: { ...DEFAULT_EXAM.plantScope, ...(input.plantScope || {}) } };
    this.validate(exam);
    return this.store.put('exams', exam);
  }

  update(id, patch) {
    const exam = this.get(id);
    if (!exam) throw new Error('not_found');
    const next = { ...exam, ...patch, id, plantScope: { ...exam.plantScope, ...(patch.plantScope || {}) } };
    this.validate(next);
    return this.store.put('exams', next);
  }

  remove(id) { return this.store.remove('exams', id); }

  validate(exam) {
    if (!exam.title && !exam.titleAr) throw new Error('title_required');
    if (!(exam.questionCount >= 1 && exam.questionCount <= 200)) throw new Error('bad_question_count');
    if (!(exam.durationMinutes >= 1 && exam.durationMinutes <= 600)) throw new Error('bad_duration');
    if (!(exam.passMark >= 0 && exam.passMark <= 100)) throw new Error('bad_pass_mark');
    if (!(exam.generatedShare >= 0 && exam.generatedShare <= 1)) throw new Error('bad_generated_share');
  }

  availableBankCount(topics) {
    const t = topics?.length ? topics : null;
    return this.bank.questions.filter(q => !t || t.includes(q.topic)).length;
  }

  buildQuestionSet(exam, seed) {
    const rng = gen.mulberry32(gen.seedFrom(seed));
    const wantGenerated = Math.round(exam.questionCount * (exam.generatedShare ?? 0.4));
    const topics = exam.topics?.length ? exam.topics : null;
    let bankPool = this.bank.questions.filter(q => !topics || topics.includes(q.topic));
    if (bankPool.length === 0) bankPool = this.bank.questions.slice();
    const bankQs = gen.shuffle(rng, bankPool).slice(0, exam.questionCount - wantGenerated).map(q => ({ ...q, generated: false }));
    const genQs = wantGenerated > 0 ? gen.generate(this.dataset, { count: wantGenerated, countries: exam.plantScope?.countries, technologies: exam.plantScope?.technologies, seed }) : [];
    let all = [...bankQs, ...genQs];
    if (all.length < exam.questionCount) {
      // top up from any bank question not used yet
      const usedIds = new Set(all.map(q => q.id));
      const extra = gen.shuffle(rng, this.bank.questions.filter(q => !usedIds.has(q.id))).slice(0, exam.questionCount - all.length);
      all = [...all, ...extra.map(q => ({ ...q, generated: false }))];
    }
    if (exam.shuffle !== false) all = gen.shuffle(rng, all);
    // shuffle options too (keeping correct index in sync)
    return all.map(q => {
      const order = gen.shuffle(rng, q.options.map((_, i) => i));
      return { ...q, options: order.map(i => q.options[i]), correct: order.indexOf(q.correct) };
    });
  }

  attemptsOf(userId, examId) {
    return this.store.find('attempts', a => a.userId === userId && a.examId === examId);
  }

  start(examId, user) {
    const exam = this.get(examId);
    if (!exam || exam.active === false) throw new Error('not_found');
    if (user.role === 'student' && exam.assignedGroups?.length && !exam.assignedGroups.includes(user.groupId)) throw new Error('forbidden');
    const previous = this.attemptsOf(user.id, examId);
    const open = previous.find(a => !a.submittedAt);
    if (open) {
      if (Date.now() < new Date(open.deadlineAt).getTime() + 60000) return this.viewForStudent(open);
      this.finalize(open, open.answers || [], true);
    }
    const done = previous.filter(a => a.submittedAt).length;
    if (exam.maxAttempts > 0 && done >= exam.maxAttempts) throw new Error('max_attempts');
    const id = Store.newId('at-');
    const questions = this.buildQuestionSet(exam, id);
    const now = new Date();
    const attempt = {
      id, examId, userId: user.id, username: user.username, displayName: user.displayName, groupId: user.groupId || null,
      examTitle: exam.title, examTitleAr: exam.titleAr, kind: exam.kind || 'exam',
      startedAt: now.toISOString(), deadlineAt: new Date(now.getTime() + exam.durationMinutes * 60000).toISOString(),
      submittedAt: null, questions, answers: new Array(questions.length).fill(null), score: null, percent: null, passed: null,
      attemptNumber: done + 1, passMark: exam.passMark,
    };
    this.store.put('attempts', attempt);
    return this.viewForStudent(attempt);
  }

  startPractice(cfg, user) {
    const exam = { ...DEFAULT_EXAM, id: 'practice', title: 'Practice quiz', titleAr: 'اختبار تدريبي', kind: 'practice',
      topics: cfg.topics || [], questionCount: Math.min(Math.max(Number(cfg.questionCount) || 10, 3), 60), generatedShare: cfg.generatedShare ?? 0.5,
      plantScope: cfg.plantScope || { countries: [], technologies: [] }, durationMinutes: cfg.durationMinutes || 60, passMark: cfg.passMark ?? 60, maxAttempts: 0 };
    const id = Store.newId('pr-');
    const questions = this.buildQuestionSet(exam, id);
    const now = new Date();
    const attempt = {
      id, examId: 'practice', userId: user.id, username: user.username, displayName: user.displayName, groupId: user.groupId || null,
      examTitle: exam.title, examTitleAr: exam.titleAr, kind: 'practice',
      startedAt: now.toISOString(), deadlineAt: new Date(now.getTime() + exam.durationMinutes * 60000).toISOString(),
      submittedAt: null, questions, answers: new Array(questions.length).fill(null), score: null, percent: null, passed: null,
      attemptNumber: 1, passMark: exam.passMark, plantId: cfg.plantId || null,
    };
    this.store.put('attempts', attempt);
    return this.viewForStudent(attempt);
  }

  viewForStudent(attempt) {
    return {
      id: attempt.id, examId: attempt.examId, examTitle: attempt.examTitle, examTitleAr: attempt.examTitleAr, kind: attempt.kind,
      startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, attemptNumber: attempt.attemptNumber, passMark: attempt.passMark,
      questions: attempt.questions.map(sanitizeQuestion), answers: attempt.answers,
    };
  }

  save(attemptId, answers, user) {
    const a = this.store.get('attempts', attemptId);
    if (!a || a.userId !== user.id) throw new Error('not_found');
    if (a.submittedAt) throw new Error('already_submitted');
    a.answers = this.cleanAnswers(a, answers);
    this.store.put('attempts', a);
    return { ok: true };
  }

  cleanAnswers(attempt, answers) {
    return attempt.questions.map((q, i) => {
      const v = Array.isArray(answers) ? answers[i] : null;
      return Number.isInteger(v) && v >= 0 && v < q.options.length ? v : null;
    });
  }

  submit(attemptId, answers, user) {
    const a = this.store.get('attempts', attemptId);
    if (!a || a.userId !== user.id) throw new Error('not_found');
    if (a.submittedAt) return this.result(a, true);
    const late = Date.now() > new Date(a.deadlineAt).getTime() + 60000;
    return this.finalize(a, this.cleanAnswers(a, answers), late);
  }

  finalize(a, answers, late = false) {
    a.answers = answers;
    a.submittedAt = new Date().toISOString();
    a.late = late;
    a.durationSec = Math.round((new Date(a.submittedAt) - new Date(a.startedAt)) / 1000);
    let score = 0;
    const byTopic = {};
    a.questions.forEach((q, i) => {
      const ok = answers[i] === q.correct;
      if (ok) score++;
      const t = byTopic[q.topic] || (byTopic[q.topic] = { total: 0, correct: 0 });
      t.total++; if (ok) t.correct++;
    });
    a.score = score;
    a.percent = Math.round((score / a.questions.length) * 1000) / 10;
    a.passed = a.percent >= (a.passMark ?? 60);
    a.byTopic = byTopic;
    this.store.put('attempts', a);
    const exam = a.examId === 'practice' ? { showAnswers: true } : (this.get(a.examId) || { showAnswers: true });
    return this.result(a, exam.showAnswers !== false);
  }

  result(a, withAnswers) {
    return {
      id: a.id, examId: a.examId, examTitle: a.examTitle, examTitleAr: a.examTitleAr, kind: a.kind, userId: a.userId, displayName: a.displayName, username: a.username,
      startedAt: a.startedAt, submittedAt: a.submittedAt, durationSec: a.durationSec, late: !!a.late,
      score: a.score, total: a.questions.length, percent: a.percent, passed: a.passed, passMark: a.passMark, byTopic: a.byTopic, attemptNumber: a.attemptNumber,
      questions: withAnswers ? a.questions.map((q, i) => ({ ...q, answer: a.answers[i] })) : a.questions.map((q, i) => ({ ...sanitizeQuestion(q), answer: a.answers[i] })),
    };
  }

  mine(user) {
    return this.store.find('attempts', a => a.userId === user.id).sort((x, y) => y.startedAt.localeCompare(x.startedAt)).map(a => this.summary(a));
  }

  summary(a) {
    return {
      id: a.id, examId: a.examId, examTitle: a.examTitle, examTitleAr: a.examTitleAr, kind: a.kind, userId: a.userId, username: a.username, displayName: a.displayName, groupId: a.groupId,
      startedAt: a.startedAt, submittedAt: a.submittedAt, durationSec: a.durationSec, late: !!a.late, score: a.score, total: a.questions.length, percent: a.percent, passed: a.passed, passMark: a.passMark, attemptNumber: a.attemptNumber, byTopic: a.byTopic || null,
    };
  }

  query({ examId, userId, groupId, kind, submittedOnly = true } = {}) {
    return this.store.find('attempts', a =>
      (!examId || a.examId === examId) && (!userId || a.userId === userId) && (!groupId || a.groupId === groupId) && (!kind || a.kind === kind) && (!submittedOnly || a.submittedAt)
    ).sort((x, y) => y.startedAt.localeCompare(x.startedAt)).map(a => this.summary(a));
  }

  getFull(attemptId) {
    const a = this.store.get('attempts', attemptId);
    return a ? this.result(a, true) : null;
  }

  /** Role-aware view: students never receive correct answers before submission (or when the exam hides them). */
  getView(attemptId, user) {
    const a = this.store.get('attempts', attemptId);
    if (!a) throw new Error('not_found');
    if (user.role === 'student' && a.userId !== user.id) throw new Error('forbidden');
    if (!a.submittedAt) {
      if (Date.now() > new Date(a.deadlineAt).getTime() + 60000) return this.finalize(a, a.answers || [], true);
      return { ...this.viewForStudent(a), inProgress: true };
    }
    const exam = a.examId === 'practice' ? null : this.get(a.examId);
    const withAnswers = user.role !== 'student' || !exam || exam.showAnswers !== false;
    return this.result(a, withAnswers);
  }

  stats(filter = {}) {
    const rows = this.query(filter);
    const n = rows.length;
    if (!n) return { count: 0, mean: 0, median: 0, passRate: 0, min: 0, max: 0, histogram: [], byTopic: {}, byExam: {} };
    const pct = rows.map(r => r.percent).sort((a, b) => a - b);
    const mean = pct.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 ? pct[(n - 1) / 2] : (pct[n / 2 - 1] + pct[n / 2]) / 2;
    const histogram = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0 }));
    for (const p of pct) histogram[Math.min(9, Math.floor(p / 10))].count++;
    const byTopic = {};
    for (const r of rows) for (const [t, v] of Object.entries(r.byTopic || {})) { const b = byTopic[t] || (byTopic[t] = { total: 0, correct: 0 }); b.total += v.total; b.correct += v.correct; }
    const byExam = {};
    for (const r of rows) { const b = byExam[r.examId] || (byExam[r.examId] = { title: r.examTitle, titleAr: r.examTitleAr, count: 0, sum: 0, passed: 0 }); b.count++; b.sum += r.percent; if (r.passed) b.passed++; }
    for (const b of Object.values(byExam)) { b.mean = Math.round(b.sum / b.count * 10) / 10; b.passRate = Math.round(b.passed / b.count * 1000) / 10; }
    return { count: n, mean: Math.round(mean * 10) / 10, median: Math.round(median * 10) / 10, passRate: Math.round(rows.filter(r => r.passed).length / n * 1000) / 10, min: pct[0], max: pct[n - 1], histogram, byTopic, byExam };
  }
}

module.exports = { Exams, DEFAULT_EXAM };
