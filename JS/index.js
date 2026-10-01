 // ---------------------------------------------------------------
  // Mentors load from mentors.json, which lives right alongside this
  // file in the repo. A GitHub Actions workflow (see
  // .github/workflows/update-mentors.yml) regenerates that file from
  // Airtable once an hour and commits it — so the Airtable token never
  // touches the browser, and this page just reads a static file.
  // ---------------------------------------------------------------
  const MENTORS_JSON_PATH = "./mentors.json";
 
  let MENTORS = [];
 
  // Fallback list used only if mentors.json is missing or empty, so the
  // page never shows completely blank. Edit or clear this as you like.
  const FALLBACK_MENTORS = [
    { name: "Mentor Names Coming Soon", schedulingUrl: "mentor-ctd" },
  ];
 
  const mentorListEl = document.getElementById('mentorList');
  const mentorNameEl = document.getElementById('mentorName');
  const embedWrap = document.getElementById('embedWrap');
  const groupSessionLinkEl = document.getElementById('groupSessionLink'); // optional — safe if missing
 
  function initials(name) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
 
  // Figures out which scheduling platform a URL belongs to, so we know
  // which kind of embed to build. Add more domains here if a mentor
  // ever shows up with yet another scheduler.
  function detectProvider(schedulingUrl) {
    try {
      const host = new URL(schedulingUrl).hostname;
      if (host.includes('calendly.com')) return 'calendly';
      if (host.includes('calendar.google.com')) return 'google';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  function renderList() {
    mentorListEl.innerHTML = '';
    MENTORS.forEach((mentor, i) => {
      const li = document.createElement('li');
      li.className = 'mentor-item';
      li.id = `mentor-item-${i}`;
      li.innerHTML = `
        <button type="button" aria-pressed="false">
          <span class="avatar">${initials(mentor.name)}</span>
            <span class="mentor-name">${mentor.name}</span>
        </button>
      `;
      li.querySelector('button').addEventListener('click', () => selectMentor(i));
      mentorListEl.appendChild(li);
    });
  }
 

function renderCalendlyEmbed(schedulingUrl) {
  // Calendly needs their JS widget API to actually initialize the
  // embed — just dropping a div with a data-url attribute into the
  // page doesn't work for elements added after page load, since
  // Calendly's script only auto-scans the DOM once, when it first
  // loads. We call their API explicitly instead.
  const url = schedulingUrl.includes('?')
    ? `${schedulingUrl}&hide_gdpr_banner=1`
    : `${schedulingUrl}?hide_gdpr_banner=1`;
 
  embedWrap.innerHTML = `<div class="calendly-inline-widget" data-url="${url}"></div>`;
 
  if (window.Calendly && window.Calendly.initInlineWidget) {
    window.Calendly.initInlineWidget({
      url: url,
      parentElement: embedWrap.querySelector('.calendly-inline-widget'),
    });
  }
}
 
function renderGoogleEmbed(schedulingUrl) {
  // Google's appointment scheduler is much simpler to embed than
  // Calendly — it's just a plain iframe, no JS API needed. ?gv=true
  // hides some of Google's own page chrome around the widget.
  const url = schedulingUrl.includes('?')
    ? `${schedulingUrl}&gv=true`
    : `${schedulingUrl}?gv=true`;
 
  embedWrap.innerHTML =
    `<iframe src="${url}" style="width:100%; height:100%; min-height:700px; border:0; border-radius:12px;" frameborder="0"></iframe>`;
}
 
function selectMentor(index) {
  const mentor = MENTORS[index];
  if (!mentor) return;
 
  // update active state
  document.querySelectorAll('.mentor-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`mentor-item-${index}`).classList.add('active');
  document.querySelectorAll('.mentor-item button').forEach(b => b.setAttribute('aria-pressed', 'false'));
  document.querySelector(`#mentor-item-${index} button`).setAttribute('aria-pressed', 'true');
 
  // update header text
  mentorNameEl.textContent = mentor.name;
 
  const provider = detectProvider(mentor.schedulingUrl);
  if (provider === 'calendly') {
    renderCalendlyEmbed(mentor.schedulingUrl);
  } else if (provider === 'google') {
    renderGoogleEmbed(mentor.schedulingUrl);
  } else {
    // Unknown platform — don't guess at an embed that might not work.
    // Show a direct link instead so booking still isn't a dead end.
    embedWrap.innerHTML = `
      <div class="empty-state">
        We can't embed this mentor's scheduling page directly.
        <br><a href="${mentor.schedulingUrl}" target="_blank" rel="noopener">Open their scheduling page in a new tab</a>
      </div>`;
  }
}
 
async function loadMentors() {
  mentorListEl.innerHTML = '<li class="status-msg">Loading mentors…</li>';
  try {
    // cache: 'no-store' avoids the browser serving a stale cached
    // copy between hourly updates
    const resp = await fetch(MENTORS_JSON_PATH, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
    const data = await resp.json();
    if (!data.mentors || !data.mentors.length) throw new Error('No mentors in mentors.json');
    MENTORS = data.mentors;
 
    // Update the group session calendar link if present. This only
    // touches href, so if it's missing from mentors.json (e.g. no row
    // in Airtable has it set yet) the link just keeps whatever was
    // already in the HTML rather than breaking.
    if (groupSessionLinkEl && data.groupSessionLink) {
      groupSessionLinkEl.href = data.groupSessionLink;
    }
  } catch (err) {
    console.error('Failed to load mentors.json:', err);
    MENTORS = FALLBACK_MENTORS;
  }
  renderList();
  if (MENTORS.length > 0) {
    selectMentor(0);
  } else {
    embedWrap.innerHTML = '<div class="empty-state">No mentors are available right now.</div>';
  }
}
 
loadMentors();
