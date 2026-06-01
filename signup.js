const serviceIntro = document.querySelector("#serviceIntro");
const introSlides = document.querySelectorAll("[data-intro-slide]");
const introDots = document.querySelectorAll("[data-intro-dot]");
const introPrevButton = document.querySelector("#introPrevButton");
const introNextButton = document.querySelector("#introNextButton");
const signupForm = document.querySelector("#signupForm");
const signupRefUid = document.querySelector("#signupRefUid");
const signupName = document.querySelector("#signupName");
const signupPhone = document.querySelector("#signupPhone");
const signupBirthDate = document.querySelector("#signupBirthDate");
const signupGender = document.querySelector("#signupGender");
const signupRegion = document.querySelector("#signupRegion");
const signupEmail = document.querySelector("#signupEmail");
const agreeTerms = document.querySelector("#agreeTerms");
const agreePrivacy = document.querySelector("#agreePrivacy");
const agreeMarketing = document.querySelector("#agreeMarketing");
const signupMessage = document.querySelector("#signupMessage");
const activeTermsList = document.querySelector("#activeTermsList");
const toast = document.querySelector("#toast");

const params = new URLSearchParams(window.location.search);
let currentIntroSlide = 0;
signupRefUid.value = params.get("ref") || "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setIntroSlide(index) {
  currentIntroSlide = Math.max(0, Math.min(index, introSlides.length - 1));

  introSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === currentIntroSlide);
  });

  introDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === currentIntroSlide);
  });

  introPrevButton.disabled = currentIntroSlide === 0;
  introNextButton.textContent = currentIntroSlide === introSlides.length - 1 ? "가입 정보 입력하기" : "다음";
}

function showSignupForm() {
  serviceIntro.hidden = true;
  signupForm.hidden = false;
  signupName.focus();
}

function renderActiveTerms(terms) {
  activeTermsList.replaceChildren();

  if (!terms.length) {
    const empty = document.createElement("div");
    empty.className = "form-note";
    empty.textContent = "활성 약관이 없습니다.";
    activeTermsList.append(empty);
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
    activeTermsList.append(item);
  });
}

async function loadActiveTerms() {
  try {
    const response = await maruFetch("/api/terms/active?scope=funeral_member");
    const result = await response.json();
    renderActiveTerms(result.terms || []);
  } catch {
    renderActiveTerms([]);
  }
}

introPrevButton.addEventListener("click", () => {
  setIntroSlide(currentIntroSlide - 1);
});

introNextButton.addEventListener("click", () => {
  if (currentIntroSlide === introSlides.length - 1) {
    showSignupForm();
    return;
  }

  setIntroSlide(currentIntroSlide + 1);
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!signupRefUid.value) {
    signupMessage.textContent = "유효하지 않은 가입 링크입니다.";
    signupMessage.classList.add("error");
    showToast("가입 링크를 확인해주세요.");
    return;
  }

  try {
    const response = await maruFetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refUid: signupRefUid.value,
        name: signupName.value.trim(),
        phone: signupPhone.value.trim(),
        birthDate: signupBirthDate.value.trim(),
        gender: signupGender.value,
        region: signupRegion.value.trim(),
        email: signupEmail.value.trim(),
        agreedTerms: agreeTerms.checked,
        agreedPrivacy: agreePrivacy.checked,
        agreedMarketing: agreeMarketing.checked,
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

setIntroSlide(0);
loadActiveTerms();
