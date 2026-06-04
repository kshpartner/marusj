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
const memberTabButtons = document.querySelectorAll("[data-member-tab]");
const memberTabs = document.querySelectorAll(".member-tab");
const memberFilterButtons = document.querySelectorAll("[data-member-filter]");
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
let currentMemberFilter = "all";

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
  center_manager: "사업단",
  sales: "팀장",
  funeral_member: "상조 회원",
  customer: "상조 회원",
};

const genderLabels = {
  male: "남성",
  female: "여성",
  other: "기타",
};

const statusLabels = {
  active: "활성",
  joined: "가입 완료",
  pending: "상담 접수",
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatBirthDate(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return value || "-";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) return value || "-";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function getCertificateNo(member) {
  const date = new Date(member.createdAt || Date.now());
  const datePart = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10).replaceAll("-", "")
    : date.toISOString().slice(0, 10).replaceAll("-", "");
  return `MARU-${datePart}-${String(member.uid || "").toUpperCase()}`;
}

function getOrganizationPath(member, memberMap) {
  const chain = [];
  let cursor = member;
  const visited = new Set();

  while (cursor && !visited.has(cursor.uid)) {
    visited.add(cursor.uid);
    chain.unshift(cursor.name || cursor.uid);
    cursor = cursor.parentUid ? memberMap.get(cursor.parentUid) : null;
  }

  if (!chain.length) return "-";
  return chain.join(" > ");
}

function openMembershipCertificate(member, memberMap) {
  const certificateWindow = window.open("", "_blank", "width=980,height=1200");

  if (!certificateWindow) {
    showToast("팝업 차단을 해제한 뒤 다시 시도해주세요.");
    return;
  }

  const parent = member.parentUid ? memberMap.get(member.parentUid) : null;
  const issuedAt = formatDate(member.createdAt || new Date());
  const certificateNo = getCertificateNo(member);
  const organizationPath = getOrganizationPath(member, memberMap);
  const logoUrl = new URL("./icons/maru-logo.svg", window.location.href).href;
  const status = statusLabels[member.status] || member.status || "상담 접수";
  const gender = genderLabels[member.gender] || member.gender || "-";

  const rows = [
    ["증서번호", certificateNo],
    ["회원 UID", member.uid],
    ["성명", member.name],
    ["연락처", maskPhone(member.phone)],
    ["생년월일", formatBirthDate(member.birthDate || member.birth_date)],
    ["성별", gender],
    ["지역", member.region || "-"],
    ["가입 상태", status],
    ["담당/상위자", parent ? `${parent.name || parent.uid} (${parent.uid})` : member.parentUid || "-"],
    ["조직 경로", organizationPath],
    ["가입 접수일", issuedAt],
  ];

  certificateWindow.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(member.name)} 가입증서</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #1d1d1d;
            color: #161616;
            font-family: "Pretendard", "Malgun Gothic", "Segoe UI", sans-serif;
          }
          .certificate-page {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm 18mm;
            background: #fffaf0;
          }
          .certificate-page::before {
            content: "";
            position: absolute;
            inset: 10mm;
            border: 2px solid #b99642;
            pointer-events: none;
          }
          .certificate-page::after {
            content: "";
            position: absolute;
            inset: 14mm;
            border: 1px solid rgba(185, 150, 66, 0.32);
            pointer-events: none;
          }
          .certificate-inner {
            position: relative;
            z-index: 1;
            display: grid;
            min-height: 257mm;
            grid-template-rows: auto auto 1fr auto;
            gap: 18px;
          }
          .certificate-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 2px solid #161616;
            padding-bottom: 18px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand img {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: #000;
          }
          .brand strong {
            display: block;
            color: #161616;
            font-size: 20px;
            letter-spacing: 0;
          }
          .brand span,
          .certificate-no {
            color: #6a5a32;
            font-size: 12px;
            font-weight: 800;
          }
          .title-block {
            display: grid;
            gap: 10px;
            padding: 18px 0 10px;
            text-align: center;
          }
          .title-block span {
            color: #b99642;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.12em;
          }
          h1 {
            margin: 0;
            color: #111;
            font-size: 36px;
            letter-spacing: 0.08em;
          }
          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 8px;
          }
          .summary-card {
            border: 1px solid rgba(185, 150, 66, 0.44);
            padding: 14px;
            background: rgba(185, 150, 66, 0.08);
          }
          .summary-card span {
            display: block;
            margin-bottom: 6px;
            color: #6a5a32;
            font-size: 12px;
            font-weight: 900;
          }
          .summary-card strong {
            color: #111;
            font-size: 22px;
          }
          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 2px solid #161616;
            border-left: 1px solid #cdb06b;
          }
          .detail-row {
            display: grid;
            grid-template-columns: 92px minmax(0, 1fr);
            min-height: 42px;
            border-right: 1px solid #cdb06b;
            border-bottom: 1px solid #cdb06b;
          }
          .detail-row.wide {
            grid-column: 1 / -1;
          }
          .detail-row span {
            display: grid;
            place-items: center;
            background: #161616;
            color: #f3e1a8;
            font-size: 12px;
            font-weight: 900;
          }
          .detail-row strong {
            display: flex;
            align-items: center;
            min-width: 0;
            padding: 10px 12px;
            color: #161616;
            font-size: 14px;
            line-height: 1.45;
            word-break: keep-all;
          }
          .statement {
            display: grid;
            gap: 12px;
            border: 1px solid rgba(185, 150, 66, 0.46);
            padding: 18px;
            background: rgba(255, 255, 255, 0.5);
            color: #292311;
            font-size: 15px;
            font-weight: 800;
            line-height: 1.75;
            text-align: center;
          }
          .statement small {
            color: #6a5a32;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.6;
          }
          .certificate-footer {
            display: grid;
            gap: 14px;
            padding-top: 18px;
            text-align: center;
          }
          .issued-date {
            color: #161616;
            font-size: 16px;
            font-weight: 900;
          }
          .signature {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            justify-self: center;
            min-width: 280px;
            border-top: 2px solid #161616;
            padding-top: 14px;
            color: #161616;
            font-size: 20px;
            font-weight: 900;
          }
          .signature img {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #000;
          }
          .print-actions {
            position: fixed;
            right: 18px;
            top: 18px;
            display: flex;
            gap: 8px;
          }
          .print-actions button {
            min-height: 38px;
            border: 1px solid #b99642;
            border-radius: 8px;
            padding: 0 13px;
            background: #111;
            color: #f3e1a8;
            font-weight: 900;
            cursor: pointer;
          }
          @media print {
            body { background: #fffaf0; }
            .certificate-page { margin: 0; }
            .print-actions { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button onclick="window.print()">PDF 저장 / 인쇄</button>
          <button onclick="window.close()">닫기</button>
        </div>
        <main class="certificate-page">
          <section class="certificate-inner">
            <header class="certificate-header">
              <div class="brand">
                <img src="${logoUrl}" alt="마루상조" />
                <div>
                  <strong>마루상조</strong>
                  <span>MARU FUNERAL MEMBERSHIP</span>
                </div>
              </div>
              <div class="certificate-no">${escapeHtml(certificateNo)}</div>
            </header>

            <section class="title-block">
              <span>MEMBERSHIP CERTIFICATE</span>
              <h1>상조 회원 가입증서</h1>
              <div class="summary">
                <div class="summary-card"><span>회원명</span><strong>${escapeHtml(member.name || "-")}</strong></div>
                <div class="summary-card"><span>가입 상태</span><strong>${escapeHtml(status)}</strong></div>
              </div>
            </section>

            <section>
              <div class="details">
                ${rows
                  .map(([label, value]) => `
                    <div class="detail-row ${label === "조직 경로" ? "wide" : ""}">
                      <span>${escapeHtml(label)}</span>
                      <strong>${escapeHtml(value || "-")}</strong>
                    </div>
                  `)
                  .join("")}
              </div>
              <div class="statement">
                위 회원은 마루상조 파트너 관리 시스템을 통해 상조 회원 가입 신청이 정상 접수되었음을 확인합니다.
                <small>
                  본 증서는 가입 신청 접수 확인용 문서입니다. 최종 상품, 계약 조건 및 서비스 제공 범위는 상담 및 별도 계약서 기준으로 확정됩니다.
                </small>
              </div>
            </section>

            <footer class="certificate-footer">
              <div class="issued-date">${escapeHtml(issuedAt)}</div>
              <div class="signature">
                <span>마루상조 파트너 운영본부</span>
                <img src="${logoUrl}" alt="" />
              </div>
            </footer>
          </section>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.setTimeout(() => window.print(), 350);
          });
        </script>
      </body>
    </html>
  `);

  certificateWindow.document.close();
}

function applyPermissions() {
  document.querySelectorAll('[data-view="terms"]').forEach((item) => {
    item.hidden = !isAdmin;
  });

  document.querySelectorAll('[data-view="links"]').forEach((item) => {
    item.hidden = !canCreateSignupLink;
  });

  document.querySelectorAll(".link-only").forEach((item) => {
    item.hidden = !canCreateSignupLink;
  });

  document.querySelectorAll(".admin-only").forEach((item) => {
    item.hidden = !isAdmin;
  });

  document.querySelector("#copyInviteButton").hidden = !canCreateSignupLink;

  if (!isAdmin) {
    showMemberTab("list");
  }

  if (rootEyebrow) {
    rootEyebrow.textContent = isAdmin ? "최상위 루트: admin" : `조회 루트: ${currentRootUid}`;
  }

  if (refUid) {
    refUid.value = currentRootUid;
    refUid.readOnly = !isAdmin;
  }
}

function setView(viewName) {
  if (viewName === "terms" && !isAdmin) {
    showToast("약관 관리는 admin 권한에서만 사용할 수 있습니다.");
    viewName = "dashboard";
  }

  if (viewName === "links" && !canCreateSignupLink) {
    showToast("상조 약관 링크는 admin 또는 팀장만 만들 수 있습니다.");
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

function showMemberTab(tabName) {
  memberTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.memberTab === tabName);
  });

  memberTabs.forEach((tab) => {
    const isTarget =
      (tabName === "list" && tab.id === "memberListTab") || (tabName === "center" && tab.id === "centerCreateTab");
    tab.classList.toggle("active", isTarget);
  });
}

function setMemberFilter(filter) {
  currentMemberFilter = filter;
  memberFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.memberFilter === filter);
  });
  renderMembers(treeMembers);
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
  const response = await maruFetch(`/api/members/tree?rootUid=${encodeURIComponent(currentRootUid)}`);
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

function getParentName(member, memberMap) {
  if (!member.parentUid) return "-";
  return memberMap.get(member.parentUid)?.name || "-";
}

function getFilteredMembers(members) {
  if (currentMemberFilter === "sales") {
    return members.filter((member) => member.role === "sales");
  }

  if (currentMemberFilter === "funeral_member") {
    return members.filter((member) => ["funeral_member", "customer"].includes(member.role));
  }

  return members;
}

function renderMembers(members) {
  const memberMap = new Map(members.map((member) => [member.uid, member]));
  const visibleMembers = getFilteredMembers(members);
  membersTableBody.replaceChildren();

  if (!visibleMembers.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.textContent = "표시할 회원이 없습니다.";
    row.append(cell);
    membersTableBody.append(row);
    return;
  }

  visibleMembers.forEach((member) => {
    const row = document.createElement("tr");
    [
      member.uid,
      member.name,
      member.phone || "-",
      member.birthDate || member.birth_date || "-",
      genderLabels[member.gender] || member.gender || "-",
      member.region || "-",
      roleLabels[member.role] || member.role,
      getParentName(member, memberMap),
      member.parentUid || "-",
      statusLabels[member.status] || member.status,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "";
      row.append(cell);
    });

    const certificateCell = document.createElement("td");
    if (["funeral_member", "customer"].includes(member.role)) {
      const certificateButton = document.createElement("button");
      certificateButton.type = "button";
      certificateButton.className = "outline-button compact-action";
      certificateButton.textContent = "증서 출력";
      certificateButton.addEventListener("click", () => openMembershipCertificate(member, memberMap));
      certificateCell.append(certificateButton);
    } else {
      certificateCell.textContent = "-";
    }
    row.append(certificateCell);
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
    showToast("사업단은 admin만 등록할 수 있습니다.");
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
    const response = await maruFetch("/api/members/centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      centerMessage.textContent = result.message || "사업단 등록에 실패했습니다.";
      centerMessage.classList.add("error");
      showToast(centerMessage.textContent);
      return;
    }

    centerForm.reset();
    centerMessage.textContent = `${result.center.name} (${result.center.uid}) 사업단이 등록되었습니다.`;
    centerMessage.classList.remove("error");
    showToast("사업단이 등록되었습니다.");
    treeLoaded = false;
    membersLoaded = false;
    showMemberTab("list");
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
    const response = await maruFetch("/api/invite-links", {
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
    sales_register: "팀장 회원가입 약관",
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
      maruFetch(`/api/terms?scope=${encodeURIComponent(document.querySelector("#termScope").value)}`),
      maruFetch("/api/terms/agreements"),
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
    const response = await maruFetch(
      `/api/terms/${encodeURIComponent(payload.scope)}/${encodeURIComponent(payload.type)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

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

memberTabButtons.forEach((button) => {
  button.addEventListener("click", () => showMemberTab(button.dataset.memberTab));
});

memberFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setMemberFilter(button.dataset.memberFilter));
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
