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

let treeMembers = [];
let treeLoaded = false;

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

treeSearchInput.addEventListener("input", renderTree);
refUid.addEventListener("input", updateInviteUrl);
updateInviteUrl();
