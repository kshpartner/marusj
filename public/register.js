const salesRegisterForm = document.querySelector("#salesRegisterForm");
const salesUsername = document.querySelector("#salesUsername");
const salesPassword = document.querySelector("#salesPassword");
const salesName = document.querySelector("#salesName");
const salesPhone = document.querySelector("#salesPhone");
const salesEmail = document.querySelector("#salesEmail");
const salesAgreeTerms = document.querySelector("#salesAgreeTerms");
const salesAgreePrivacy = document.querySelector("#salesAgreePrivacy");
const salesAgreeMarketing = document.querySelector("#salesAgreeMarketing");
const salesRegisterMessage = document.querySelector("#salesRegisterMessage");
const salesActiveTermsList = document.querySelector("#salesActiveTermsList");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderActiveTerms(terms) {
  salesActiveTermsList.replaceChildren();

  if (!terms.length) {
    const empty = document.createElement("div");
    empty.className = "form-note";
    empty.textContent = "활성 약관이 없습니다.";
    salesActiveTermsList.append(empty);
    return;
  }

  terms.forEach((term) => {
    const item = document.createElement("details");
    item.className = "terms-preview";
    const summary = document.createElement("summary");
    const content = document.createElement("p");

    summary.textContent = `${term.title} v${term.version}${term.requiredYn === "Y" ? " (필수)" : " (선택)"}`;
    content.textContent = term.content;
    item.append(summary, content);
    salesActiveTermsList.append(item);
  });
}

async function loadActiveTerms() {
  try {
    const response = await fetch("/api/terms/active?scope=sales_register");
    const result = await response.json();
    renderActiveTerms(result.terms || []);
  } catch {
    renderActiveTerms([]);
  }
}

salesRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/sales/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: salesUsername.value.trim(),
        password: salesPassword.value,
        name: salesName.value.trim(),
        phone: salesPhone.value.trim(),
        email: salesEmail.value.trim(),
        agreedTerms: salesAgreeTerms.checked,
        agreedPrivacy: salesAgreePrivacy.checked,
        agreedMarketing: salesAgreeMarketing.checked,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      salesRegisterMessage.textContent = result.message || "회원가입 정보를 확인해주세요.";
      salesRegisterMessage.classList.add("error");
      showToast("회원가입에 실패했습니다.");
      return;
    }

    salesRegisterForm.reset();
    salesRegisterMessage.textContent = `${result.sales.uid} 영업사원 계정이 생성되었습니다.`;
    salesRegisterMessage.classList.remove("error");
    showToast("회원가입이 완료되었습니다.");
  } catch {
    salesRegisterMessage.textContent = "서버에 연결할 수 없습니다.";
    salesRegisterMessage.classList.add("error");
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
});

loadActiveTerms();
