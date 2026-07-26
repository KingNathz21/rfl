(() => {
  const form = document.querySelector('#journeyForm');
  const fromInput = document.querySelector('#journeyFrom');
  const toInput = document.querySelector('#journeyTo');
  const results = document.querySelector('#journeyResults');
  const swap = document.querySelector('#swapJourney');
  const preference = document.querySelector('#journeyPreference');
  if (!form || !fromInput || !toInput || !results) return;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const modeLabel = (mode) => ({ walking: 'Walk', bus: 'Bus', tube: 'Tube', overground: 'Overground', elizabethline: 'Elizabeth line', dlr: 'DLR', tram: 'Tram', nationalrail: 'National Rail', riverbus: 'River' }[String(mode || '').toLowerCase()] || mode || 'Travel');
  const time = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  swap?.addEventListener('click', () => {
    const current = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = current;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const from = fromInput.value.trim();
    const to = toInput.value.trim();
    if (!from || !to) return;

    results.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    const params = new URLSearchParams({
      journeyPreference: preference?.value || 'leasttime',
      walkingSpeed: 'average',
      cyclePreference: 'none'
    });

    try {
      const response = await fetch(`https://api.tfl.gov.uk/Journey/JourneyResults/${encodeURIComponent(from)}/to/${encodeURIComponent(to)}?${params}`);
      if (!response.ok) throw new Error(`TfL returned ${response.status}`);
      const data = await response.json();
      const journeys = Array.isArray(data.journeys) ? data.journeys.slice(0, 5) : [];
      if (!journeys.length) {
        results.innerHTML = '<article class="planner-empty"><span>!</span><h2>No journeys found</h2><p>Try a nearby station, stop name or full postcode.</p></article>';
        return;
      }

      results.innerHTML = journeys.map((journey, index) => {
        const modes = [...new Set((journey.legs || []).map((leg) => modeLabel(leg.mode?.id || leg.mode?.name)))];
        const changes = Math.max(0, (journey.legs || []).filter((leg) => String(leg.mode?.id).toLowerCase() !== 'walking').length - 1);
        const summary = (journey.legs || []).map((leg) => {
          const line = leg.routeOptions?.[0]?.name;
          return line ? `${modeLabel(leg.mode?.id)} ${line}` : modeLabel(leg.mode?.id);
        }).join(' → ');
        return `<article class="journey-option">
          <div><span class="section-kicker">OPTION ${index + 1}</span><div class="journey-time">${esc(time(journey.startDateTime))}–${esc(time(journey.arrivalDateTime))}</div></div>
          <div><div class="journey-modes">${modes.map((mode) => `<span class="journey-mode">${esc(mode)}</span>`).join('')}</div><p>${esc(summary)}</p><small>${changes ? `${changes} change${changes === 1 ? '' : 's'}` : 'Direct'} · ${Math.round(journey.fare?.totalCost ? journey.fare.totalCost / 100 : 0) ? `Estimated fare £${(journey.fare.totalCost / 100).toFixed(2)}` : 'Live TfL journey data'}</small></div>
          <div class="journey-duration">${esc(journey.duration)} mins</div>
        </article>`;
      }).join('');
    } catch (error) {
      results.innerHTML = '<article class="planner-empty"><span>!</span><h2>Journey planner unavailable</h2><p>We could not reach TfL right now. Check your connection and try again.</p></article>';
    }
  });
})();