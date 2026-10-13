/**
 * מדידת עלות הריחוף: כמה זמן לוקחת סריקה אחת של הסימונים כשיש N מהם באותה
 * פסקה (המקרה הגרוע — סינון לפי בלוק אינו עוזר).
 *   node scripts/qa/autocorrect-indicator-perf-probe.mjs [N]
 */
import { openApp } from './harness.mjs';
const N = Number(process.argv[2] ?? 40);
const app = await openApp({ name: 'acorr-perf', port: Number(process.env.QA_PORT ?? 9635) });
try {
  await app.caret(0);
  for (let i = 0; i < N; i += 1) {
    await app.type('אאכ ', 20);
    await app.sleep(260);
  }
  await app.sleep(800);
  const result = await app.js(`(async function(){
    var frame = function(){ return new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); }); };
    var fragment = document.querySelector('[data-source-node-id][data-pm-start]');
    var run = fragment.querySelector('.superdoc-text-run');
    var rect = run.getBoundingClientRect();
    var inText = { x: rect.left + 3, y: rect.top + rect.height / 2 };
    var runs = fragment.querySelectorAll('[data-pm-start]').length;
    async function measure(point, target) {
      var times = [];
      for (var i = 0; i < 30; i += 1) {
        var t0 = performance.now();
        target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: point.x + (i % 5), clientY: point.y }));
        await frame();
        times.push(performance.now() - t0);
      }
      times.sort(function(a, b){ return a - b; });
      return { median: +times[15].toFixed(2), p90: +times[27].toFixed(2), max: +times[29].toFixed(2) };
    }
    var over = await measure(inText, document.elementFromPoint(inText.x, inText.y));
    var outside = await measure({ x: 5, y: 5 }, document.body);
    // עלות העבודה עצמה: אותן פעולות DOM של locateText, פעם אחת לכל סימון
    function oneLocate() {
      var frags = document.querySelectorAll('[data-source-node-id][data-pm-start]');
      for (var f = 0; f < frags.length; f += 1) {
        var fr = frags[f]; var base = Number(fr.getAttribute('data-pm-start'));
        var rs = fr.querySelectorAll('[data-pm-start]'); var para = '';
        for (var k = 0; k < rs.length; k += 1) { var n = rs[k].firstChild; if (n && n.nodeType === 3) para += n.nodeValue; }
        var i = para.indexOf('אא"כ');
        if (i >= 0) {
          var node = null; for (var q = 0; q < rs.length && !node; q += 1) { if (rs[q].firstChild && rs[q].firstChild.nodeType === 3) node = rs[q].firstChild; } var rg = document.createRange(); rg.setStart(node, 0); rg.setEnd(node, Math.min(4, node.nodeValue.length));
          rg.getClientRects();
        }
        if (para.length === -1) return base;
      }
    }
    var entries = ${N};
    var t0 = performance.now();
    for (var rep = 0; rep < 20; rep += 1) for (var e = 0; e < entries; e += 1) oneLocate();
    var work = (performance.now() - t0) / 20;
    return JSON.stringify({ runs: runs, entries: entries, scanWorkMsPerFrame: +work.toFixed(2), overText: over, outsideDoc: outside });
  })()`);
  console.log('N =', N, result);
} finally {
  app.close();
}
