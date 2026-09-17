'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Store } = require('../src/main/services/store');
const { Exams } = require('../src/main/services/exams');
const gen = require('../src/main/services/question-generator');
const { tmpDir, rm, loadDataset, loadBank } = require('./helpers');

const ds = loadDataset(); const bank = loadBank();
const student = { id: 'u-s1', username: 's1', displayName: 'Student One', role: 'student', groupId: 'g1' };
const other = { id: 'u-s2', username: 's2', displayName: 'Student Two', role: 'student', groupId: 'g2' };

test('question generator produces valid, deterministic questions from real plant data', () => {
  const qs = gen.generate(ds, { count: 30, seed: 'abc' });
  assert.equal(qs.length, 30);
  for (const q of qs) {
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.correct >= 0 && q.correct < 4);
    assert.ok(q.prompt.ar && q.prompt.en);
    assert.ok(q.options.every(o => o.ar && o.en));
    assert.equal(new Set(q.options.map(o => o.en)).size, 4, 'options must be distinct: ' + q.id);
  }
  const again = gen.generate(ds, { count: 30, seed: 'abc' });
  assert.deepEqual(qs.map(q => q.id), again.map(q => q.id));
  const egy = gen.generate(ds, { count: 10, seed: 'x', countries: ['EGY'] });
  assert.ok(egy.every(q => q.kind === 'countryTotal' || ds.plants.find(p => p.id === q.plantId).country === 'EGY'));
});

test('exam lifecycle: create, start, answers hidden, grade, stats', () => {
  const dir = tmpDir();
  try {
    const ex = new Exams(new Store(dir), bank, ds);
    const exam = ex.create({ title: 'Midterm', titleAr: 'نصفي', topics: ['general', 'pv'], questionCount: 10, generatedShare: 0.5, durationMinutes: 30, passMark: 50, maxAttempts: 1, assignedGroups: ['g1'] }, 'admin');
    assert.equal(ex.listForUser(student).length, 1);
    assert.equal(ex.listForUser(other).length, 0, 'not assigned to other group');
    assert.throws(() => ex.start(exam.id, other), /forbidden/);
    const view = ex.start(exam.id, student);
    assert.equal(view.questions.length, 10);
    assert.ok(view.questions.every(q => q.correct === undefined && q.explanation === undefined), 'answers must be hidden');
    assert.equal(view.questions.filter(q => q.generated).length, 5);
    const stored = ex.store.get('attempts', view.id);
    const answers = stored.questions.map((q, i) => (i % 2 === 0 ? q.correct : (q.correct + 1) % 4));
    ex.save(view.id, answers, student);
    assert.throws(() => ex.save(view.id, answers, other), /not_found/);
    const res = ex.submit(view.id, answers, student);
    assert.equal(res.score, 5); assert.equal(res.percent, 50); assert.equal(res.passed, true);
    assert.ok(res.questions.every(q => typeof q.correct === 'number'));
    assert.throws(() => ex.start(exam.id, student), /max_attempts/);
    const st = ex.stats({ examId: exam.id });
    assert.equal(st.count, 1); assert.equal(st.mean, 50); assert.equal(st.passRate, 100);
    assert.equal(ex.mine(student).length, 1);
    // getView respects roles and states
    const v2 = ex.getView(view.id, student);
    assert.equal(v2.percent, 50);
    assert.throws(() => ex.getView(view.id, other), /forbidden/);
  } finally { rm(dir); }
});

test('practice quiz can be started without an exam and hidden answers are enforced until submission', () => {
  const dir = tmpDir();
  try {
    const ex = new Exams(new Store(dir), bank, ds);
    const v = ex.startPractice({ topics: ['wind'], questionCount: 6, generatedShare: 0.5, plantScope: { countries: ['MAR'], technologies: ['wind_onshore'] } }, student);
    assert.equal(v.kind, 'practice'); assert.equal(v.questions.length, 6);
    const inProgress = ex.getView(v.id, student);
    assert.equal(inProgress.inProgress, true);
    assert.ok(inProgress.questions.every(q => q.correct === undefined));
    const res = ex.submit(v.id, new Array(6).fill(0), student);
    assert.equal(res.total, 6);
  } finally { rm(dir); }
});
