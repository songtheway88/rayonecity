/**
 * 청주 테크노 레이원시티 공식 분양 랜딩페이지 스크립트
 * 주요 기능:
 * 1. 모바일 메뉴 (햄버거 메뉴) 토글 & ARIA 속성 제어
 * 2. 앵커 링크 부드러운 스크롤 (Smooth Scroll)
 * 3. 접이식 상세 가이드 아코디언 토글
 * 4. 연락처 자동 하이픈 포맷팅 및 실시간 입력 검증
 * 5. 방문예약 폼 제출 제어 및 가상 완료 모달 처리 (허니팟 스팸 방지 포함)
 * 6. 개인정보 수집/이용 동의 팝업 모달 제어
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. 모바일 메뉴 토글 ===
  const menuButton = document.querySelector('[data-menu-button]');
  const mobileNav = document.querySelector('[data-mobile-nav]');

  if (menuButton && mobileNav) {
    const toggleMenu = () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', !isExpanded);
      mobileNav.classList.toggle('open');
      // 드로어가 열릴 때 스크롤 방지
      document.body.style.overflow = !isExpanded ? 'hidden' : '';
    };

    menuButton.addEventListener('click', toggleMenu);

    // 모바일 메뉴 링크 클릭 시 드로어 닫기
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuButton.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // === 2. 앵커 링크 부드러운 스크롤 ===
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  scrollLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      
      // 모달/동의서 등 가상 앵커 링크는 스크롤 동작에서 제외
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        
        // 헤더 높이만큼 오프셋 설정하여 스크롤
        const headerHeight = document.querySelector('[data-header]')?.offsetHeight || 70;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // 스크롤 이동 후 포커스 이동 (키보드 접근성 대응)
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus({ preventScroll: true });
      }
    });
  });

  // === 3. 접이식 상세 가이드 아코디언 토글 ===
  const guideToggle = document.getElementById('guideToggle');
  const guideContent = document.getElementById('guideContent');

  if (guideToggle && guideContent) {
    guideToggle.addEventListener('click', () => {
      const isExpanded = guideToggle.getAttribute('aria-expanded') === 'true';
      guideToggle.setAttribute('aria-expanded', !isExpanded);
      
      if (!isExpanded) {
        guideContent.classList.add('show');
        // 애니메이션 효과를 위해 높이를 동적으로 가져옴
        const contentHeight = guideContent.scrollHeight;
        guideContent.style.maxHeight = contentHeight + 'px';
        guideToggle.querySelector('span').textContent = '청주 테크노 레이원시티 상세 가이드 접기';
      } else {
        guideContent.style.maxHeight = '0px';
        guideToggle.querySelector('span').textContent = '청주 테크노 레이원시티 상세 가이드 전체보기';
        // 트랜지션 완료 후 class 제거를 위해 대기
        setTimeout(() => {
          if (guideToggle.getAttribute('aria-expanded') === 'false') {
            guideContent.classList.remove('show');
          }
        }, 400);
      }
    });
  }

  // === 4. 연락처 실시간 자동 포맷터 (010-0000-0000) ===
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // 숫자 이외의 문자 제거
      let number = e.target.value.replace(/[^0-9]/g, '');
      let formatted = '';

      if (number.length < 4) {
        formatted = number;
      } else if (number.length < 7) {
        formatted = `${number.substr(0, 3)}-${number.substr(3)}`;
      } else if (number.length < 11) {
        formatted = `${number.substr(0, 3)}-${number.substr(3, 3)}-${number.substr(6)}`;
      } else {
        formatted = `${number.substr(0, 3)}-${number.substr(3, 4)}-${number.substr(7, 4)}`;
      }
      e.target.value = formatted;
    });

    // 실시간 유효성 스타일 검사 (blur 시)
    phoneInput.addEventListener('blur', () => {
      const phonePattern = /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/;
      if (phoneInput.value && !phonePattern.test(phoneInput.value)) {
        phoneInput.setCustomValidity('유효한 전화번호 형식(예: 010-0000-0000)으로 입력해 주세요.');
      } else {
        phoneInput.setCustomValidity('');
      }
    });

    // 타이핑 중에는 경고 메시지 리셋
    phoneInput.addEventListener('input', () => {
      phoneInput.setCustomValidity('');
    });
  }

  // === 5. 방문예약 폼 제출 제어 & 가상 완료 모달 ===
  const reservationForm = document.getElementById('reservationForm');
  const resultModal = document.getElementById('resultModal');
  const closeModal = document.getElementById('closeModal');
  const confirmModal = document.getElementById('confirmModal');

  if (reservationForm && resultModal) {
    reservationForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // 스팸 방지용 허니팟 필드 검증
      const honeyPotValue = document.getElementById('email_confirm')?.value;
      if (honeyPotValue) {
        console.warn('Spam detection: Honeypot field is filled.');
        // 스팸봇으로 간주하고 정상 제출인 것처럼 처리하나 실제 제출은 차단
        alert('신청이 성공적으로 접수되었습니다. (Spam blocked)');
        reservationForm.reset();
        return;
      }

      // 전화번호 정규식 추가 검증
      const phonePattern = /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/;
      if (!phonePattern.test(phoneInput.value)) {
        phoneInput.setCustomValidity('올바른 연락처 형식을 입력하세요.');
        phoneInput.reportValidity();
        return;
      }

      // 개인정보 자동 동의 체크박스 확인
      const agreeCheckbox = document.getElementById('agree');
      if (!agreeCheckbox || !agreeCheckbox.checked) {
        alert('개인정보 수집 및 이용에 동의하셔야 신청이 가능합니다.');
        return;
      }

      // 제출 버튼 로딩 상태 표시
      const submitBtn = reservationForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '신청하기';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '전송 중...';
      }

      // 데이터 수집
      const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        type: document.getElementById('type').value,
        residence: document.getElementById('residence').value.trim(),
        visit_date: document.getElementById('visit_date').value.trim(),
        message: document.getElementById('message').value.trim(),
        source: document.querySelector('input[name="source"]:checked')?.value || '기타'
      };

      // API 호출
      fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('API request failed');
        }
        return response.json();
      })
      .then(data => {
        // 성공 시 완료 모달 띄우기
        resultModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 모달 노출 시 뒷배경 스크롤 방지
      })
      .catch(error => {
        console.error('Submission error:', error);
        alert('신청 전송에 실패했습니다. 대표 번호(1551-2811)로 연락해 예약해 주시면 친절히 안내 도와드리겠습니다.');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      });
    });

    // 결과 안내 모달 닫기 제어
    const hideResultModal = () => {
      resultModal.style.display = 'none';
      document.body.style.overflow = '';
      reservationForm.reset(); // 입력 폼 초기화
    };

    closeModal?.addEventListener('click', hideResultModal);
    confirmModal?.addEventListener('click', hideResultModal);

    // 모달 바깥 영역 클릭 시 닫기
    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) {
        hideResultModal();
      }
    });
  }

  // === 6. 개인정보 상세 모달 창 제어 ===
  const privacyLink = document.getElementById('privacyLink');
  const privacyModal = document.getElementById('privacyModal');
  const closePrivacyModal = document.getElementById('closePrivacyModal');
  const agreePrivacyBtn = document.getElementById('agreePrivacyBtn');

  if (privacyLink && privacyModal) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      privacyModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });

    const hidePrivacyModal = () => {
      privacyModal.style.display = 'none';
      document.body.style.overflow = '';
    };

    closePrivacyModal?.addEventListener('click', hidePrivacyModal);
    
    agreePrivacyBtn?.addEventListener('click', () => {
      const agreeCheckbox = document.getElementById('agree');
      if (agreeCheckbox) {
        agreeCheckbox.checked = true;
      }
      hidePrivacyModal();
    });

    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) {
        hidePrivacyModal();
      }
    });
  }

  // === 7. 동적 비디오 임베드 재생 ===
  const videoEmbeds = document.querySelectorAll('[data-video-embed]');
  videoEmbeds.forEach(container => {
    const videoId = container.getAttribute('data-video-embed');
    
    const playTrigger = container.classList.contains('tour-card') 
      ? container.querySelector('.tour-image') 
      : container.querySelector('.video-placeholder');

    const loadVideo = () => {
      const targetArea = container.classList.contains('tour-card')
        ? container.querySelector('.tour-image')
        : container.querySelector('.video-placeholder');
        
      if (!targetArea) return;

      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', `https://tv.naver.com/embed/${videoId}?autoPlay=true`);
      iframe.setAttribute('title', '네이버 TV 동영상 플레이어');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';

      targetArea.innerHTML = '';
      targetArea.appendChild(iframe);
      
      const moreBtn = container.querySelector('.tour-more-btn');
      if (moreBtn) {
        moreBtn.textContent = '영상 재생 중';
        moreBtn.style.opacity = '0.7';
        moreBtn.style.cursor = 'default';
        moreBtn.disabled = true;
      }
    };

    if (playTrigger) {
      playTrigger.addEventListener('click', loadVideo);
    }
    
    const moreBtn = container.querySelector('.tour-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadVideo();
      });
    }
  });
});
