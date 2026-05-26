const signupForm = document.querySelector("#signupForm");
const signupRefUid = document.querySelector("#signupRefUid");
const signupName = document.querySelector("#signupName");
const signupPhone = document.querySelector("#signupPhone");
const signupEmail = document.querySelector("#signupEmail");
const agreeTerms = document.querySelector("#agreeTerms");
const agreePrivacy = document.querySelector("#agreePrivacy");
const signupMessage = document.querySelector("#signupMessage");
const toast = document.querySelector("#toast");

const params = new URLSearchParams(window.location.search);
signupRefUid.value = params.get("ref") || "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refUid: signupRefUid.value,
        name: signupName.value.trim(),
        phone: signupPhone.value.trim(),
        email: signupEmail.value.trim(),
        agreedTerms: agreeTerms.checked,
        agreedPrivacy: agreePrivacy.checked,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      signupMessage.textContent = result.message || "가입 신청 정보를 확인해주세요.";
      signupMessage.classList.add("error");
      showToast("가입 신청에 실패했습니다.");
      return;
    }

    signupForm.reset();
    signupRefUid.value = result.member.parentUid;
    signupMessage.textContent = "가입 신청이 완료되었습니다.";
    signupMessage.classList.remove("error");
    showToast("가입 신청이 완료되었습니다.");
  } catch {
    signupMessage.textContent = "서버에 연결할 수 없습니다.";
    signupMessage.classList.add("error");
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
});
