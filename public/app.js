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
}

function updateInviteUrl() {
  const uid = refUid.value.trim() || "sales_001";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  inviteUrl.value = `${url.origin}${url.pathname.replace(/index\.html$/, "")}signup.html?ref=${encodeURIComponent(uid)}`;
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
  const uid = refUid.value.trim() || "sales_001";

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

refUid.addEventListener("input", updateInviteUrl);
updateInviteUrl();
