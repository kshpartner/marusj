const isLoggedIn = sessionStorage.getItem("maruAdminLoggedIn") === "true";

if (!isLoggedIn) {
  window.location.replace("./login.html");
}

const logoutButton = document.querySelector("#logoutButton");
const menuItems = document.querySelectorAll(".menu-item");
const views = document.querySelectorAll(".view");
const viewTitle = document.querySelector("#viewTitle");
const toast = document.querySelector("#toast");
const refUid = document.querySelector("#refUid");
const inviteUrl = document.querySelector("#inviteUrl");
const treeBoard = document.querySelector("#treeBoard");
const treeSearchInput = document.querySelector("#treeSearchInput");
const termForm = document.querySelector("#termForm");
const termsList = document.querySelector("#termsList");
const termAgreementsBody = document.querySelector("#termAgreementsBody");
const refreshTermsButton = document.querySelector("#refreshTermsButton");

let treeMembers = [];
let treeLoaded = false;
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
  sales: "영업사원",
  funeral_member: "상조 회원",
  customer: "상조 회원",
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setView(viewName) {
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

  if (viewName === "terms" && !termsLoaded) {
    loadTerms();
  }
}

function updateInviteUrl() {
  const uid = refUid.value.trim() || "admin";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  inviteUrl.value = `${url.origin}${url.pathname.replace(/index\.html$/, "")}signup.html?ref=${encodeURIComponent(uid)}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function memberMatches(member, query) {
  if (!query) {
    return true;
  }

  return [member.name, member.uid, member.phone, member.email, member.parentUid]
    .some((value) => normalizeText(value).includes(query));
}

function buildTree(members, query = "") {
  const normalizedQuery = normalizeText(query);
  const memberMap = new Map();
  const childMap = new Map();

  members.forEach((member) => {
    memberMap.set(member.uid, {
      ...member,
      children: [],
    });
  });

  memberMap.forEach((member) => {
    const parentUid = member.parentUid || member.parent_uid;
    if (!parentUid) {
      return;
    }

    if (!childMap.has(parentUid)) {
      childMap.set(parentUid, []);
    }

    childMap.get(parentUid).push(member.uid);
  });

  memberMap.forEach((member) => {
    const childUids = childMap.get(member.uid) || [];
    member.children = childUids.map((uid) => memberMap.get(uid)).filter(Boolean);
  });

  const root = memberMap.get("admin") || [...memberMap.values()].find((member) => !member.parentUid && !member.parent_uid);

  function cloneVisible(member) {
    const visibleChildren = member.children.map(cloneVisible).filter(Boolean);
    const isMatch = memberMatches(member, normalizedQuery);

    if (!isMatch && visibleChildren.length === 0) {
      return null;
    }

    return {
      ...member,
      children: visibleChildren,
    };
  }

  return root ? cloneVisible(root) : null;
}

function createTreeNode(member) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  const label = document.createElement("span");
  const role = member.role || "customer";

  button.type = "button";
  button.className = `tree-node ${role === "admin" ? "admin-node" : role === "sales" ? "sales-node" : "customer-node"}`;
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

async function loadTree() {
  treeBoard.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "tree-loading";
  loading.textContent = "조직 트리를 불러오는 중입니다.";
  treeBoard.append(loading);

  try {
    const response = await fetch("/api/members/tree?rootUid=admin");
    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || "조직 트리를 불러오지 못했습니다.");
      return;
    }

    treeMembers = result.members || [];
    treeLoaded = true;
    renderTree();
  } catch {
    showToast("조직 트리 API 서버 상태를 확인해주세요.");
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
  const uid = refUid.value.trim() || "admin";

  try {
    const response = await fetch("/api/invite-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    service_terms: "상조 서비스 이용약관",
    privacy_policy: "개인정보 수집 및 이용 동의",
    marketing_consent: "마케팅 수신 동의",
  };

  return labels[type] || type;
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
    meta.textContent = `${getTermTypeLabel(term.type)} · ${term.requiredYn === "Y" ? "필수" : "선택"}`;
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
    cell.colSpan = 5;
    cell.textContent = "동의 이력이 없습니다.";
    row.append(cell);
    termAgreementsBody.append(row);
    return;
  }

  agreements.forEach((agreement) => {
    const row = document.createElement("tr");
    [agreement.userUid, agreement.termTitle, agreement.termVersion, agreement.agreedYn, agreement.agreedAt]
      .forEach((value) => {
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
      fetch("/api/terms"),
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
    title: document.querySelector("#termTitle").value.trim(),
    version: document.querySelector("#termVersion").value.trim(),
    content: document.querySelector("#termContent").value.trim(),
    requiredYn: document.querySelector("#termRequired").checked ? "Y" : "N",
  };

  try {
    const response = await fetch(`/api/terms/${encodeURIComponent(payload.type)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      showToast(result.message || "약관 저장에 실패했습니다.");
      return;
    }

    showToast("약관이 수정되었습니다.");
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

termForm.addEventListener("submit", saveTerm);
refreshTermsButton.addEventListener("click", loadTerms);
document.querySelector("#termType").addEventListener("change", (event) => {
  const term = currentTerms.find((item) => item.type === event.target.value);
  if (term) {
    fillTermForm(term);
  }
});
treeSearchInput.addEventListener("input", renderTree);
refUid.addEventListener("input", updateInviteUrl);
updateInviteUrl();
