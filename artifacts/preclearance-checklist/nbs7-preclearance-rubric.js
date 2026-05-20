const STORAGE_KEY = "nbs7_preclearance_checklist_v6";
let showIncompleteOnly = false;
let collapsedSections = new Set();
let printTextareaSnapshots = [];
const printMirrorFields = [
  { sourceId: "tracked-changes", mirrorId: "tracked-changes-print" },
  { sourceId: "submission-notes", mirrorId: "submission-notes-print" }
];

const tier1Sections = [
  {
    id: "accuracy",
    icon: "🔬",
    title: "Technical accuracy",
    items: [
      { id: "a1", text: "All content has been tested or verified against the current NBS 7 environment.", badges: ["required"] },
      { id: "a2", text: "Version-specific details (software versions, file paths, port numbers) are correct and explicitly stated.", badges: ["required"] },
      { id: "a3", text: "Technical claims that go beyond standard NBS 7 configuration have been verified with a subject-matter expert.", badges: [] }
    ]
  },
  {
    id: "audience",
    icon: "👥",
    title: "Audience fit (STLT system administrators)",
    items: [
      { id: "b1", text: "Content is written for system administrators at state, tribal, local, or territorial health departments — not for developers or CDC staff.", badges: [] },
      { id: "b2", text: "Acronyms are spelled out on first use. CDC-internal acronyms unfamiliar to STLT audiences are defined or avoided.", badges: ["required"] },
      { id: "b3", text: "Content does not assume familiarity with CDC internal systems, organizational structure, or processes.", badges: [] }
    ]
  },
  {
    id: "policy",
    icon: "🛡",
    title: "CDC policy alignment",
    items: [
      { id: "c1", text: "Content does not contradict current NBS 7 or CDC recommendations, guidelines, or official positions.", badges: ["required"] },
      { id: "c2", text: "If this content describes a change from previous guidance, the change is flagged and the rationale is documented in the submission notes.", badges: ["required"] },
      { id: "c3", text: "No statements imply CDC endorsement of third-party products, vendors, or configurations. References to third-party tools are neutral and descriptive only.", badges: ["required"] },
      { id: "c4", text: "If this content includes credentials, access tokens, access control configurations, or vulnerability details, I have contacted CDC partners before submitting.", badges: ["escalate"] }
    ]
  }
];

const tier2Sections = [
  {
    id: "completeness",
    icon: "§",
    title: "Completeness and structure",
    items: [
      { id: "d1", text: "The article has a clear purpose statement or introduction that tells the reader what they will accomplish.", badges: [] },
      { id: "d2", text: "All procedures are complete end-to-end with no missing or implied steps.", badges: [] },
      { id: "d3", text: "Edge cases, known limitations, or troubleshooting guidance are included where a reader is likely to get stuck.", badges: [] },
      { id: "d4", text: "Related articles or prerequisites are linked where relevant.", badges: [] },
      { id: "d5", text: "The article does not contain placeholder text, unresolved comments, or TODO content.", badges: [] }
    ]
  },
  {
    id: "style",
    icon: "✍",
    title: "Plain language and style",
    items: [
      { id: "e1", text: "Procedures are written in imperative mood (for example, Select the configuration file) and not passive voice.", badges: [] },
      { id: "e2", text: "Sentences are concise. Filler phrases (simply, just, please, in order to) have been removed.", badges: [] },
      { id: "e3", text: "Technical terms are used consistently throughout the article.", badges: [] },
      { id: "e4", text: "UI element names match exactly what appears in the NBS 7 interface.", badges: [] },
      { id: "e5", text: "Global English conventions are followed with short, literal phrasing.", badges: [] }
    ]
  },
  {
    id: "mechanics",
    icon: "🔧",
    title: "Mechanics and formatting",
    items: [
      { id: "f1", text: "Spelling and grammar have been checked.", badges: [] },
      { id: "f2", text: "Headings follow the established hierarchy and sentence case conventions.", badges: [] },
      { id: "f3", text: "Code blocks, commands, and file paths are formatted consistently.", badges: [] },
      { id: "f4", text: "Images or screenshots are current, annotated where needed, and include alt text.", badges: [] },
      { id: "f5", text: "All internal links have been tested and resolve correctly in the current branch.", badges: [] }
    ]
  },
  {
    id: "submission",
    icon: "📤",
    title: "Submission readiness",
    items: [
      { id: "g1", text: "Content has passed internal team review and CDC partner review.", badges: [] },
      { id: "g2", text: "If cross-clearance is needed (content affects another CDC program area), it has been identified and noted.", badges: [] },
      { id: "g3", text: "Supporting materials (tracked changes draft, SME sign-off) are attached or referenced in the submission.", badges: [] },
      { id: "g4", text: "Submission notes clearly describe what changed from the previous version, or state this is new content.", badges: [] }
    ]
  }
];

const allSections = [
  ...tier1Sections.map(function(s) { return Object.assign({}, s, { tier: 1 }); }),
  ...tier2Sections.map(function(s) { return Object.assign({}, s, { tier: 2 }); })
];

const handoffFields = [
  "author-name", "content-title", "content-link", "review-date",
  "jira-tickets", "github-pr", "other-link",
  "tracked-changes", "submission-notes"
];

const fieldDefaults = {
  "jira-tickets": "https://cdc-nbs.atlassian.net/browse/STLT-",
  "github-pr": "https://github.com/CDCgov/NEDSS-SystemAdminGuide/",
  "other-link": "https://"
};

function getSavedState() {
  try {
    var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    var checks = parsed && parsed.checks && typeof parsed.checks === "object" ? parsed.checks : {};
    var meta = parsed && parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};
    var ui = parsed && parsed.ui && typeof parsed.ui === "object" ? parsed.ui : {};
    return {
      checks: checks,
      meta: meta,
      ui: {
        showIncompleteOnly: Boolean(ui.showIncompleteOnly),
        collapsedSectionIds: Array.isArray(ui.collapsedSectionIds)
          ? ui.collapsedSectionIds.filter(function(id) { return typeof id === "string"; })
          : []
      }
    };
  } catch (_) {
    return { checks: {}, meta: {}, ui: { showIncompleteOnly: false, collapsedSectionIds: [] } };
  }
}

function saveState() {
  var state = { checks: {}, meta: {}, ui: { showIncompleteOnly: showIncompleteOnly, collapsedSectionIds: Array.from(collapsedSections) }, lastUpdated: new Date().toISOString() };
  document.querySelectorAll("input[type='checkbox']").forEach(function(cb) { state.checks[cb.id] = cb.checked; });
  handoffFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) state.meta[id] = el.value;
  });
  syncPrintMirrors();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setFilterButtonState() {
  document.querySelectorAll(".filter-toggle-btn").forEach(function(btn) {
    btn.setAttribute("aria-pressed", String(showIncompleteOnly));
    btn.textContent = showIncompleteOnly ? "Show all items" : "Show incomplete only";
  });
}

function restoreHandoffFields(meta) {
  handoffFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && meta[id] !== undefined) el.value = meta[id];
  });
}

function syncPrintMirrors() {
  printMirrorFields.forEach(function(pair) {
    var source = document.getElementById(pair.sourceId);
    var mirror = document.getElementById(pair.mirrorId);
    if (source && mirror) {
      mirror.textContent = source.value || "";
    }
  });
}

function setCollapseAllButtonsState() {
  var allCollapsed = allSections.every(function(s) { return collapsedSections.has(s.id); });
  document.querySelectorAll(".collapse-all-btn").forEach(function(btn) {
    btn.textContent = allCollapsed ? "Expand all sections" : "Collapse all sections";
  });
}

function applySectionCollapseState(sectionId) {
  var el = document.getElementById("section-" + sectionId);
  if (!el) return;
  var isCollapsed = collapsedSections.has(sectionId);
  el.classList.toggle("section-collapsed", isCollapsed);
  var btn = el.querySelector(".section-toggle-btn");
  if (btn) {
    btn.textContent = isCollapsed ? "Expand" : "Collapse";
    btn.setAttribute("aria-expanded", String(!isCollapsed));
  }
}

function applyAllSectionCollapseState() {
  allSections.forEach(function(s) { applySectionCollapseState(s.id); });
  setCollapseAllButtonsState();
}

function buildSectionHTML(section, savedState) {
  var div = document.createElement("section");
  div.className = "section";
  div.id = "section-" + section.id;
  div.innerHTML =
    '<div class="section-header">' +
      '<span class="section-icon" aria-hidden="true">' + section.icon + '</span>' +
      '<p class="section-title">' + section.title + '</p>' +
      '<div class="section-actions">' +
        '<span class="section-count" id="count-' + section.id + '"></span>' +
        '<button type="button" class="section-toggle-btn" data-section-id="' + section.id + '" aria-expanded="true">Collapse</button>' +
      '</div>' +
    '</div>' +
    '<div class="section-content">' +
      section.items.map(function(item) {
        return '<div class="item" id="wrap-' + item.id + '" data-item-id="' + item.id + '">' +
          '<input type="checkbox" id="' + item.id + '"' + (savedState.checks[item.id] ? ' checked' : '') + '>' +
          '<label for="' + item.id + '">' +
            item.text +
            (item.badges.includes("required") ? '<span class="badge badge-required">required</span>' : '') +
            (item.badges.includes("escalate") ? '<span class="badge badge-escalate">escalate</span>' : '') +
          '</label>' +
        '</div>';
      }).join('') +
      '<p class="section-filter-empty">All items in this section are already complete.</p>' +
    '</div>';
  return div;
}

function buildSections() {
  var savedState = getSavedState();
  var container1 = document.getElementById("sections-tier1");
  var container2 = document.getElementById("sections-tier2");
  tier1Sections.forEach(function(s) { container1.appendChild(buildSectionHTML(s, savedState)); });
  tier2Sections.forEach(function(s) { container2.appendChild(buildSectionHTML(s, savedState)); });
  showIncompleteOnly = savedState.ui.showIncompleteOnly;
  collapsedSections = new Set(savedState.ui.collapsedSectionIds);
  restoreHandoffFields(savedState.meta);
  setFilterButtonState();
  applyAllSectionCollapseState();
}

function toggleSectionCollapse(sectionId) {
  if (collapsedSections.has(sectionId)) { collapsedSections.delete(sectionId); }
  else { collapsedSections.add(sectionId); }
  applySectionCollapseState(sectionId);
  setCollapseAllButtonsState();
  saveState();
}

function handleToggleCollapseAll() {
  var allCollapsed = allSections.every(function(s) { return collapsedSections.has(s.id); });
  if (allCollapsed) { collapsedSections.clear(); }
  else { allSections.forEach(function(s) { collapsedSections.add(s.id); }); }
  applyAllSectionCollapseState();
  saveState();
}

function applyIncompleteFilter() {
  allSections.forEach(function(section) {
    var visibleItems = 0;
    section.items.forEach(function(item) {
      var cb = document.getElementById(item.id);
      var wrap = document.getElementById("wrap-" + item.id);
      if (!cb || !wrap) return;
      var shouldHide = showIncompleteOnly && cb.checked;
      wrap.classList.toggle("filtered-hide", shouldHide);
      if (!shouldHide) visibleItems++;
    });
    var sectionEl = document.getElementById("section-" + section.id);
    if (sectionEl) sectionEl.classList.toggle("section-empty", showIncompleteOnly && visibleItems === 0);
  });
}

function updateProgress() {
  [
    { sections: tier1Sections, fillId: "progress-fill-tier1", labelId: "progress-label-tier1", bannerId: "ready-banner-tier1" },
    { sections: tier2Sections, fillId: "progress-fill-tier2", labelId: "progress-label-tier2", bannerId: "ready-banner-tier2" }
  ].forEach(function(tier) {
    var allItems = tier.sections.reduce(function(acc, s) {
      return acc.concat(s.items.map(function(i) { return document.getElementById(i.id); }).filter(Boolean));
    }, []);
    var total = allItems.length;
    var done = allItems.filter(function(cb) { return cb.checked; }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById(tier.fillId).style.width = pct + "%";
    document.getElementById(tier.labelId).textContent = done + " of " + total + " items";
    var banner = document.getElementById(tier.bannerId);
    banner.style.display = done === total && total > 0 ? "flex" : "none";
  });

  document.querySelectorAll("input[type='checkbox']").forEach(function(cb) {
    var wrap = document.getElementById("wrap-" + cb.id);
    if (wrap) wrap.classList.toggle("checked", cb.checked);
  });

  allSections.forEach(function(section) {
    var sectionBoxes = section.items.map(function(i) { return document.getElementById(i.id); }).filter(Boolean);
    var sectionDone = sectionBoxes.filter(function(cb) { return cb.checked; }).length;
    var countEl = document.getElementById("count-" + section.id);
    if (countEl) countEl.textContent = sectionDone + "/" + sectionBoxes.length;
  });

  applyIncompleteFilter();
}

function resetAll(clearForm) {
  document.querySelectorAll("input[type='checkbox']").forEach(function(cb) { cb.checked = false; });
  if (clearForm) {
    localStorage.removeItem(STORAGE_KEY);
    handoffFields.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = fieldDefaults[id] !== undefined ? fieldDefaults[id] : "";
    });
    showIncompleteOnly = false;
    collapsedSections.clear();
    setFilterButtonState();
    setCollapseAllButtonsState();
  } else {
    saveState();
  }
  syncPrintMirrors();
  updateProgress();
}

function expandTextareasForPrint() {
  if (printTextareaSnapshots.length > 0) return;

  document.querySelectorAll("textarea").forEach(function(el) {
    printTextareaSnapshots.push({
      element: el,
      height: el.style.height,
      overflowY: el.style.overflowY
    });

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    el.style.overflowY = "visible";
  });
}

function restoreTextareasAfterPrint() {
  printTextareaSnapshots.forEach(function(snapshot) {
    snapshot.element.style.height = snapshot.height;
    snapshot.element.style.overflowY = snapshot.overflowY;
  });
  printTextareaSnapshots = [];
}

function printChecklist() {
  saveState();
  syncPrintMirrors();
  expandTextareasForPrint();
  window.print();

  // Fallback for environments where afterprint is unreliable.
  setTimeout(function() {
    restoreTextareasAfterPrint();
  }, 1000);
}

function bindEvents() {
  document.addEventListener("click", function(event) {
    var itemEl = event.target.closest(".item");
    if (!itemEl || event.target.tagName.toLowerCase() === "input") return;
    var cb = document.getElementById(itemEl.getAttribute("data-item-id"));
    if (cb) { cb.checked = !cb.checked; saveState(); updateProgress(); }
  });

  document.querySelectorAll("input[type='checkbox']").forEach(function(cb) {
    cb.addEventListener("change", function() { saveState(); updateProgress(); });
  });

  handoffFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", saveState);
  });

  printMirrorFields.forEach(function(pair) {
    var source = document.getElementById(pair.sourceId);
    if (source) source.addEventListener("input", syncPrintMirrors);
  });

  document.querySelectorAll(".filter-toggle-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      showIncompleteOnly = !showIncompleteOnly;
      setFilterButtonState();
      saveState();
      updateProgress();
    });
  });

  document.querySelectorAll(".collapse-all-btn").forEach(function(btn) {
    btn.addEventListener("click", handleToggleCollapseAll);
  });

  document.querySelectorAll(".print-btn").forEach(function(btn) {
    btn.addEventListener("click", printChecklist);
  });

  document.querySelectorAll(".reset-checklists-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { resetAll(false); });
  });

  document.querySelectorAll(".reset-form-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { resetAll(true); });
  });

  document.querySelectorAll(".section-toggle-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { toggleSectionCollapse(btn.getAttribute("data-section-id")); });
  });

  window.addEventListener("beforeprint", expandTextareasForPrint);
  window.addEventListener("afterprint", restoreTextareasAfterPrint);
}

buildSections();
bindEvents();
syncPrintMirrors();
updateProgress();