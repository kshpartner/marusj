const isLoggedIn = sessionStorage.getItem("maruAdminLoggedIn") === "true";

if (!isLoggedIn) {
  window.location.replace("./login.html");
}

const currentUser = JSON.parse(sessionStorage.getItem("maruAdminUser") || "{}");
const isAdmin = currentUser.role === "admin";
const canCreateSignupLink = isAdmin || currentUser.role === "sales";
const currentRootUid = currentUser.uid || "admin";

const logoutButton = document.querySelector("#logoutButton");
const menuItems = document.querySelectorAll(".menu-item");
const views = document.querySelectorAll(".view");
const viewTitle = document.querySelector("#viewTitle");
const rootEyebrow = document.querySelector(".topbar .eyebrow");
const toast = document.querySelector("#toast");
const refUid = document.querySelector("#refUid");
const inviteUrl = document.querySelector("#inviteUrl");
const treeBoard = document.querySelector("#treeBoard");
const treeSearchInput = document.querySelector("#treeSearchInput");
const membersTableBody = document.querySelector("#membersTableBody");
const refreshMembersButton = document.querySelector("#refreshMembersButton");
const centerForm = document.querySelector("#centerForm");
const centerMessage = document.querySelector("#centerMessage");
const termForm = document.querySelector("#termForm");
const termsList = document.querySelector("#termsList");
const termAgreementsBody = document.querySelector("#termAgreementsBody");
const refreshTermsButton = document.querySelector("#refreshTermsButton");

let treeMembers = [];
let treeLoaded = false;
let membersLoaded = false;
let termsLoaded = false;
let currentTerms = [];

const viewLabels = {
  dashboard: "대시보드",
  tree: "조직 트리",
  members: "회원 관리",
  links: "상조 약관 링크",
  service: "상조 회원",
  commission: "커미션",
  settlement: "정산 관리",
  terms: "약관 관리",
  settings: "설정",
};

const roleLabels = {
  admin: "전체 관리자",
  center_manager: "센터장",
  sales: "영업사원",
  funeral_member: "상조 회원",
  customer: "상조 회원",
};

function applyPermissions() {
  document.querySelectorAll('[data-view="terms"]').forEach((item) => {
    item.hidden = !isAdmin;
  });

  document.querySelectorAll('[data-view="links"]').forEach((item) => {
    item.hidden = !canCreateSignupLink;
  });

  document.querySelectorAll(".admin-only").forEach((item) => {
    item.hidden = !isAdmin;
  });

  document.querySelector("#copyInviteButton").hidden = !canCreateSignupLink;

  if (rootEyebrow) {
    rootEyebrow.textContent = isAdmin ? "최상위 루트: admin" : `조회 루트: ${currentRootUid}`;
  }

  if (refUid) {
    refUid.value = currentRootUid;
    refUid.readOnly = !isAdmin;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setView(viewName) {
  if (viewName === "terms" && !isAdmin) {
    showToast("약관 관리는 admin 권한에서만 사용할 수 있습니다.");
    viewName = "dashboard";
  }

  if (viewName === "links" && !canCreateSignupLink) {
    showToast("상조 약관 링크는 admin 또는 영업사원만 만들 수 있습니다.");
    viewName = "dashboard";
  }

  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  views.forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });

  viewTitle.textContent = viewLabels[viewName] || "대시보드";

  if (viewName === "tree" && !treeLoaded) {
    loadTree();
  }

  if (viewName === "members" && !membersLoaded) {
    loadMembers();
  }

  if (viewName === "terms" && !termsLoaded) {
    loadTerms();
  }
}

function updateInviteUrl() {
  const uid = refUid.value.trim() || currentRootUid;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  inviteUrl.value = `${url.origin}${url.pathname.replace(/index\.html$/, "")}signup.html?ref=${encodeURIComponent(uid)}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function memberMatches(member, query) {
  if (!query) return true;

  return [member.name, member.uid, member.phone, member.email, member.parentUid].some((value) =>
    normalizeText(value).includes(query),
  );
}

function buildTree(members, query = "") {
  const normalizedQuery = normalizeText(query);
  const memberMap = new Map();
  const childMap = new Map();

  members.forEach((member) => {
    memberMap.set(member.uid, { ...member, children: [] });
  });

  memberMap.forEach((member) => {
    const parentUid = member.parentUid || member.parent_uid;
    if (!parentUid) return;

    if (!childMap.has(parentUid)) {
      childMap.set(parentUid, []);
    }

    childMap.get(parentUid).push(member.uid);
  });

  memberMap.forEach((member) => {
    const childUids = childMap.get(member.uid) || [];
    member.children = childUids.map((uid) => memberMap.get(uid)).filter(Boolean);
  });

  const root =
    memberMap.get(currentRootUid) || [...memberMap.values()].find((member) => !member.parentUid && !member.parent_uid);

  function cloneVisible(member) {
    const visibleChildren = member.children.map(cloneVisible).filter(Boolean);
    const isMatch = memberMatches(member, normalizedQuery);

    if (!isMatch && visibleChildren.length === 0) {
      return null;
    }

    return { ...member, children: visibleChildren };
  }

  return root ? cloneVisible(root) : null;
}

function getTreeNodeClass(role) {
  if (role === "admin") return "admin-node";
  if (role === "center_manager") return "center-node";
  if (role === "sales") return "sales-node";
  return "customer-node";
}

function createTreeNode(member) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  const label = document.createElement("span");
  const role = member.role || "customer";

  button.type = "button";
  button.className = `tree-node ${getTreeNodeClass(role)}`;
  button.append(`${member.name || member.uid} (${member.uid})`);

  label.textContent = roleLabels[role] || role;
  button.append(label);
  li.append(button);

  if (member.children.length > 0) {
    const ul = document.createElement("ul");
    member.children.forEach((child) => ul.append(createTreeNode(child)));
    li.append(ul);
  }

  return li;
}

function renderTree() {
  const root = buildTree(treeMembers, treeSearchInput.value);
  treeBoard.replaceChildren();

  if (!root) {
    const empty = document.createElement("div");
    empty.className = "tree-loading";
    empty.textContent = "표시할 조직 데이터가 없습니다.";
    treeBoard.append(empty);
    return;
  }

  const tree = document.createElement("ul");
  tree.className = "tree";
  tree.append(createTreeNode(root));
  treeBoard.append(tree);
}

function updateMetrics(members) {
  const centerMetric = document.querySelector("#centerMetric");
  const salesMetric = document.querySelector("#salesMetric");
  const memberMetric = document.querySelector("#memberMetric");

  centerMetric.textContent = members.filter((member) => member.role === "center_manager").length;
  salesMetric.textContent = members.filter((member) => member.role === "sales").length;
  memberMetric.textContent = members.filter((member) => ["funeral_member", "customer"].includes(member.role)).length;
}

async function fetchVisibleMembers() {
  const response = await fetch(`/api/members/tree?rootUid=${encodeURIComponent(currentRootUid)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "조직 정보를 불러오지 못했습니다.");
  }

  return result.members || [];
}

async function loadTree() {
  treeBoard.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "tree-loading";
  loading.textContent = "조직 트리를 불러오는 중입니다.";
  treeBoard.append(loading);

  try {
    treeMembers = await fetchVisibleMembers();
    treeLoaded = true;
    updateMetrics(treeMembers);
    renderTree();
  } catch (error) {
    showToast(error.message);
  }
}

function renderMembers(members) {
  membersTableBody.replaceChildren();

  if (!members.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "회원 목록이 없습니다.";
    row.append(cell);
    membersTableBody.append(row);
    return;
  }

  members.forEach((member) => {
    const row = document.createElement("tr");
    [member.uid, member.name, member.phone || "-", roleLabels[member.role] || member.role, member.parentUid || "-", member.status].forEach(
      (value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "";
        row.append(cell);
      },
    );
    membersTableBody.append(row);
  });
}

async function loadMembers() {
  try {
    const members = await fetchVisibleMembers();
    treeMembers = members;
    membersLoaded = true;
    updateMetrics(members);
    renderMembers(members);
  } catch (error) {
    showToast(error.message);
  }
}

async function createCenter(event) {
  event.preventDefault();

  if (!isAdmin) {
    showToast("센터장은 admin만 등록할 수 있습니다.");
    return;
  }

  const payload = {
    username: document.querySelector("#centerUsername").value.trim(),
    password: document.querySelector("#centerPassword").value,
    name: document.querySelector("#centerName").value.trim(),
    phone: document.querySelector("#centerPhone").value.trim(),
    email: document.querySelector("#centerEmail").value.trim(),
  };

  try {
    const response = await fetch("/api/members/centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      centerMessage.textContent = result.message || "센터장 등록에 실패했습니다.";
      centerMessage.classList.add("error");
      showToast(centerMessage.textContent);
      return;
    }

    centerForm.reset();
    centerMessage.textContent = `${result.center.name} (${result.center.uid}) 센터장이 등록되었습니다.`;
    centerMessage.classList.remove("error");
    showToast("센터장이 등록되었습니다.");
    treeLoaded = false;
    membersLoaded = false;
    await loadMembers();
  } catch {
    centerMessage.textContent = "서버에 연결할 수 없습니다.";
    centerMessage.classList.add("error");
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    inviteUrl.select();
    document.execCommand("copy");
    showToast(successMessage);
  }
}

async function createInviteLink() {
  const uid = refUid.value.trim() || currentRootUid;

  try {
    const response = await fetch("/api/invite-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "상조 약관 링크",
        refUid: uid,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      showToast(result.message || "상조 약관 링크 생성에 실패했습니다.");
      return;
    }

    updateInviteUrl();
    showToast("상조 약관 링크가 생성되었습니다.");
  } catch {
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
}

function getTermTypeLabel(type) {
  const labels = {
    service_terms: "서비스 이용약관",
    privacy_policy: "개인정보 수집 및 이용 동의",
    marketing_consent: "마케팅 수신 동의",
  };

  return labels[type] || type;
}

function getTermScopeLabel(scope) {
  const labels = {
    sales_register: "영업사원 회원가입 약관",
    funeral_member: "상조 회원 가입 약관",
  };

  return labels[scope] || scope;
}

function renderTerms(terms) {
  currentTerms = terms;
  termsList.replaceChildren();

  if (!terms.length) {
    const empty = document.createElement("div");
    empty.className = "tree-loading";
    empty.textContent = "등록된 약관이 없습니다.";
    termsList.append(empty);
    return;
  }

  terms.forEach((term) => {
    const item = document.createElement("article");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const content = document.createElement("p");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");

    item.className = "term-item";
    heading.className = "term-item-heading";
    title.textContent = `${term.title} v${term.version}`;
    meta.textContent = `${getTermScopeLabel(term.scope)} · ${getTermTypeLabel(term.type)} · ${
      term.requiredYn === "Y" ? "필수" : "선택"
    }`;
    content.textContent = term.content;
    actions.className = "term-item-actions";
    editButton.type = "button";
    editButton.className = "outline-button compact-action";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => fillTermForm(term));

    heading.append(title, meta);
    actions.append(editButton);
    item.append(heading, content, actions);
    termsList.append(item);
  });
}

function fillTermForm(term) {
  document.querySelector("#termScope").value = term.scope;
  document.querySelector("#termType").value = term.type;
  document.querySelector("#termTitle").value = term.title;
  document.querySelector("#termVersion").value = term.version;
  document.querySelector("#termContent").value = term.content;
  document.querySelector("#termRequired").checked = term.requiredYn === "Y";
}

function renderAgreements(agreements) {
  termAgreementsBody.replaceChildren();

  if (!agreements.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "동의 이력이 없습니다.";
    row.append(cell);
    termAgreementsBody.append(row);
    return;
  }

  agreements.forEach((agreement) => {
    const row = document.createElement("tr");
    [
      agreement.userUid,
      getTermScopeLabel(agreement.termScope),
      agreement.termTitle,
      agreement.termVersion,
      agreement.agreedYn,
      agreement.agreedAt,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "";
      row.append(cell);
    });
    termAgreementsBody.append(row);
  });
}

async function loadTerms() {
  try {
    const [termsResponse, agreementsResponse] = await Promise.all([
      fetch(`/api/terms?scope=${encodeURIComponent(document.querySelector("#termScope").value)}`),
      fetch("/api/terms/agreements"),
    ]);

    const termsResult = await termsResponse.json();
    const agreementsResult = await agreementsResponse.json();

    renderTerms(termsResult.terms || []);
    renderAgreements(agreementsResult.agreements || []);
    termsLoaded = true;
    if ((termsResult.terms || []).length) {
      fillTermForm(termsResult.terms[0]);
    }
  } catch {
    showToast("약관 정보를 불러오지 못했습니다.");
  }
}

async function saveTerm(event) {
  event.preventDefault();

  const payload = {
    type: document.querySelector("#termType").value,
    scope: document.querySelector("#termScope").value,
    title: document.querySelector("#termTitle").value.trim(),
    version: document.querySelector("#termVersion").value.trim(),
    content: document.querySelector("#termContent").value.trim(),
    requiredYn: document.querySelector("#termRequired").checked ? "Y" : "N",
  };

  try {
    const response = await fetch(`/api/terms/${encodeURIComponent(payload.scope)}/${encodeURIComponent(payload.type)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      showToast(result.message || "약관 저장에 실패했습니다.");
      return;
    }

    showToast("약관을 수정했습니다.");
    await loadTerms();
  } catch {
    showToast("약관 저장 중 오류가 발생했습니다.");
  }
}

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("maruAdminLoggedIn");
  sessionStorage.removeItem("maruAdminUser");
  window.location.replace("./login.html");
});

menuItems.forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

document.querySelectorAll("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewJump));
});

document.querySelector("#createLinkButton").addEventListener("click", createInviteLink);
document.querySelector("#copyBuiltLinkButton").addEventListener("click", () => {
  updateInviteUrl();
  copyText(inviteUrl.value, "상조 약관 링크를 복사했습니다.");
});
document.querySelector("#copyInviteButton").addEventListener("click", () => {
  updateInviteUrl();
  copyText(inviteUrl.value, "기본 상조 약관 링크를 복사했습니다.");
});

centerForm?.addEventListener("submit", createCenter);
refreshMembersButton?.addEventListener("click", loadMembers);
termForm.addEventListener("submit", saveTerm);
refreshTermsButton.addEventListener("click", loadTerms);
document.querySelector("#termType").addEventListener("change", (event) => {
  const scope = document.querySelector("#termScope").value;
  const term = currentTerms.find((item) => item.scope === scope && item.type === event.target.value);
  if (term) fillTermForm(term);
});
document.querySelector("#termScope").addEventListener("change", loadTerms);
treeSearchInput.addEventListener("input", renderTree);
refUid.addEventListener("input", updateInviteUrl);

applyPermissions();
updateInviteUrl();
loadTree();
