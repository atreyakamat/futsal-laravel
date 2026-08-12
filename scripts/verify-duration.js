(async ()=>{
  const fetch = globalThis.fetch;
  const base = 'http://localhost:3001';
  try {
    const homeRes = await fetch(base);
    const homeHtml = await homeRes.text();
    const m = homeHtml.match(/href=\"\/arena\/(\d+)\"/);
    const arenaId = m ? m[1] : '1';
    const today = new Date().toISOString().split('T')[0];
    const slotsArr = ['20:00-22:00'];
    const slotsParam = encodeURIComponent(JSON.stringify(slotsArr));
    const url = base + `/booking/checkout?arena_id=${arenaId}&date=${today}&slots=${slotsParam}`;
    console.log('Checking URL:', url);
    const res = await fetch(url);
    const html = await res.text();
    if (!html) {
      console.log('Empty checkout HTML');
      process.exit(1);
    }
    const idx = html.indexOf('Duration');
    if (idx === -1) {
      console.log('Duration label not found in checkout HTML');
      console.log('--- snippet ---');
      console.log(html.slice(0,1000));
      process.exit(0);
    }
    const snippet = html.slice(idx, idx + 800);
    console.log('Found Duration snippet:\n', snippet);

    // Try to extract .pill-status content
    const pillMatch = snippet.match(/pill-status\">([\s\S]*?)<\//);
    if (pillMatch) {
      console.log('DURATION_TEXT:', pillMatch[1].trim());
      process.exit(0);
    }

    // Fallback: find the next <span> after 'Duration'
    const spanMatch = snippet.match(/Duration[\s\S]*?<span[^>]*>([\s\S]*?)<\//);
    if (spanMatch) {
      console.log('DURATION_TEXT (fallback):', spanMatch[1].replace(/\s+/g, ' ').trim());
    } else {
      console.log('Could not extract duration text');
    }
  } catch (e) {
    console.error('Error:', e);
  }
})();
