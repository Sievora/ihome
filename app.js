// ==========================================================================
// APP.JS - Interactions, Modals, Gallery, Services, and State Handling
// ==========================================================================

(function () {
  const hasRun = document.body && document.body.dataset.appInitialized === 'true';
  if (hasRun) return;
  if (document.body) document.body.dataset.appInitialized = 'true';

  const preloader = document.getElementById('site-preloader');
  const preloaderProgress = document.getElementById('preloader-progress');
  const preloaderHomeIcon = document.getElementById('preloader-home-icon');

  function updatePreloaderProgress(value) {
    const progress = Math.min(100, Math.max(0, value));

    if (preloaderProgress) {
      preloaderProgress.style.width = `${progress}%`;
    }

    if (preloaderHomeIcon) {
      const degrees = (progress / 100) * 360;
      preloaderHomeIcon.style.setProperty('--progress-angle', `${degrees}deg`);
    }
  }

  function triggerPreloaderBounce() {
    if (!preloaderHomeIcon) return;
    preloaderHomeIcon.classList.remove('is-bouncing');
    void preloaderHomeIcon.offsetWidth;
    preloaderHomeIcon.classList.add('is-bouncing');
  }

  if (preloaderHomeIcon) {
    triggerPreloaderBounce();
    setInterval(triggerPreloaderBounce, 2000);
  }

  function finalizePreloader() {
    if (!preloader) return;
    updatePreloaderProgress(100);
    preloader.classList.add('is-hidden');
    document.body.classList.remove('preloader-active');
    document.body.classList.add('page-ready');
    setTimeout(() => {
      document.body.style.overflow = '';
    }, 300);
  }

  function waitForPageAssets() {
    const assets = Array.from(document.querySelectorAll('img, video'));
    const totalAssets = Math.max(assets.length, 1);
    const completedAssets = new Set();
    let isFinished = false;

    const finishWhenReady = () => {
      if (isFinished) return;
      isFinished = true;
      finalizePreloader();
    };

    const handleAsset = (asset) => {
      if (!asset || completedAssets.has(asset)) return;
      completedAssets.add(asset);

      const loadedCount = completedAssets.size;
      const percent = Math.round((loadedCount / totalAssets) * 100);
      updatePreloaderProgress(percent);

      if (loadedCount >= totalAssets && document.readyState === 'complete') {
        finishWhenReady();
      }
    };

    const isImageReady = (asset) => asset.tagName === 'IMG' && asset.complete && asset.naturalWidth > 0;
    const isVideoReady = (asset) => {
      if (asset.tagName !== 'VIDEO') return false;
      return asset.readyState >= 3 || asset.networkState === 3;
    };

    const startAssetWatch = (asset) => {
      if (!asset) return;

      if (isImageReady(asset) || isVideoReady(asset)) {
        handleAsset(asset);
        return;
      }

      asset.addEventListener('load', () => handleAsset(asset), { once: true });
      asset.addEventListener('error', () => handleAsset(asset), { once: true });
      asset.addEventListener('canplay', () => handleAsset(asset), { once: true });
      asset.addEventListener('canplaythrough', () => handleAsset(asset), { once: true });
    };

    assets.forEach(startAssetWatch);

    if (assets.length === 0) {
      handleAsset({});
    }

    const maybeFinish = () => {
      if (completedAssets.size >= totalAssets && document.readyState === 'complete') {
        finishWhenReady();
      }
    };

    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!isFinished) {
          updatePreloaderProgress(100);
          finishWhenReady();
        }
      }, 200);
    }, { once: true });

    const forcedFallback = setTimeout(() => {
      if (!isFinished) {
        updatePreloaderProgress(100);
        finishWhenReady();
      }
    }, 20000);

    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        clearTimeout(forcedFallback);
        maybeFinish();
      }
    });
  }

  function safelyGetStoredTheme() {
    try {
      return localStorage.getItem('dh_theme');
    } catch (error) {
      return null;
    }
  }

  function updateThemeUI(theme, buttons = []) {
    const isDark = theme === 'dark';
    const panelLabel = document.getElementById('drawer-theme-text');
    document.documentElement.setAttribute('data-theme', theme);

    buttons.forEach((button) => {
      if (!button) return;
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });

    if (panelLabel) {
      panelLabel.textContent = isDark ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    try {
      localStorage.setItem('dh_theme', nextTheme);
    } catch (error) {
      console.warn('LocalStorage unavailable:', error);
    }

    updateThemeUI(nextTheme, [document.getElementById('btn-theme-toggle')]);
  }

  function bindFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      const questionBtn = item.querySelector('.faq-question');
      if (!questionBtn) return;

      questionBtn.addEventListener('click', () => {
        const isCurrentlyActive = item.classList.contains('active');

        faqItems.forEach((otherItem) => {
          if (otherItem === item) return;
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });

        if (isCurrentlyActive) {
          item.classList.remove('active');
          questionBtn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          questionBtn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  function init() {
    const entranceItems = document.querySelectorAll('.entrance');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      entranceItems.forEach((item) => item.classList.add('is-visible'));
    } else {
      const entranceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 });

      entranceItems.forEach((item) => entranceObserver.observe(item));
    }

    const metricNumbers = document.querySelectorAll('.metric-number[data-count]');

    function renderMetric(metric, value) {
      const decimals = Number(metric.dataset.decimals || 0);
      const prefix = metric.dataset.prefix || '';
      const suffix = metric.dataset.suffix || '';
      metric.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    }

    function animateMetric(metric) {
      const target = Number(metric.dataset.count);
      const duration = 1400;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 4);
        renderMetric(metric, target * easedProgress);

        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    if (reducedMotion || !('IntersectionObserver' in window)) {
      metricNumbers.forEach((metric) => renderMetric(metric, Number(metric.dataset.count)));
    } else {
      const metricObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateMetric(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.5 });

      metricNumbers.forEach((metric) => metricObserver.observe(metric));
    }

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const btnDrawerTheme = document.getElementById('btn-drawer-theme');
    const savedTheme = safelyGetStoredTheme();
    const activeTheme = savedTheme || document.documentElement.getAttribute('data-theme') || 'light';

    updateThemeUI(activeTheme, [btnThemeToggle]);

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (event) => {
        if (!safelyGetStoredTheme()) {
          updateThemeUI(event.matches ? 'dark' : 'light', [btnThemeToggle]);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    } catch (error) {
      console.warn('Theme media query not available:', error);
    }

    if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);
    if (btnDrawerTheme) btnDrawerTheme.addEventListener('click', toggleTheme);

    const btnMenu = document.getElementById('btn-menu');
    const menuDrawer = document.getElementById('menu-drawer');

    if (btnMenu && menuDrawer) {
      btnMenu.addEventListener('click', () => {
        menuDrawer.classList.toggle('is-open');
        const isExpanded = menuDrawer.classList.contains('is-open');
        const icon = btnMenu.querySelector('.plus-icon');
        if (icon) icon.textContent = isExpanded ? '✕' : '+';
      });
    }

    const contactModal = document.getElementById('modal-contact');
    const aboutModal = document.getElementById('modal-about');
    const freebiesModal = document.getElementById('modal-freebies');
    const closeButtons = document.querySelectorAll('[data-close-modal]');

    function openModal(modal) {
      if (!modal) return;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (menuDrawer) menuDrawer.classList.remove('is-open');
      const firstInput = modal.querySelector('input, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 80);
      }
    }

    function closeAllModals() {
      [contactModal, aboutModal, freebiesModal].forEach((modal) => {
        if (modal) modal.classList.remove('is-open');
      });
      document.body.style.overflow = '';
    }

    const btnLetTalk = document.getElementById('btn-let-talk');
    const btnHowStart = document.getElementById('btn-how-start');
    const menuContactLink = document.getElementById('menu-contact-link');
    const btnAboutToContact = document.getElementById('btn-about-to-contact');
    const btnAboutMe = document.getElementById('btn-about-me');
    const btnUseForFree = document.getElementById('btn-use-for-free');
    const btnFaqContact = document.getElementById('btn-faq-contact');
    const footerContactLinks = document.querySelectorAll('[data-open-contact]');

    if (btnLetTalk) {
      btnLetTalk.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(contactModal);
      });
    }

    if (btnHowStart) {
      btnHowStart.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(contactModal);
      });
    }

    if (menuContactLink) {
      menuContactLink.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(contactModal);
      });
    }

    if (btnAboutToContact) {
      btnAboutToContact.addEventListener('click', () => {
        closeAllModals();
        openModal(contactModal);
      });
    }

    if (btnAboutMe) {
      btnAboutMe.addEventListener('click', () => openModal(aboutModal));
    }

    if (btnUseForFree) {
      btnUseForFree.addEventListener('click', () => openModal(freebiesModal));
    }

    if (btnFaqContact) {
      btnFaqContact.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(contactModal);
      });
    }

    footerContactLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          event.preventDefault();
        }
        openModal(contactModal);
      });
    });

    closeButtons.forEach((button) => button.addEventListener('click', closeAllModals));

    window.addEventListener('click', (event) => {
      if (event.target && event.target.classList && event.target.classList.contains('modal-backdrop')) {
        closeAllModals();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllModals();
        if (menuDrawer) menuDrawer.classList.remove('is-open');
      }
    });

    const contactEmail = 'sievoracompany@gmail.com';
    const btnEmailMe = document.getElementById('btn-email-me');
    const toastBubble = document.getElementById('toast-bubble');

    if (btnEmailMe) {
      btnEmailMe.addEventListener('click', async () => {
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(contactEmail);
          }
        } catch (error) {
          console.warn('Clipboard copy fallback:', error);
        }

        if (toastBubble) {
          toastBubble.textContent = `✓ Copied ${contactEmail} to clipboard`;
          toastBubble.classList.add('is-visible');
          setTimeout(() => toastBubble.classList.remove('is-visible'), 3000);
        }
      });
    }

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formContent = contactForm.innerHTML;
        contactForm.innerHTML = `
          <div style="text-align: center; padding: 28px 0;">
            <div style="width: 46px; height: 46px; background: rgba(56, 189, 248, 0.15); color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 20px; font-weight: 700;">✓</div>
            <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--color-text-main);">Inquiry Received</h4>
            <p style="font-size: 13px; color: var(--color-text-muted); max-width: 320px; margin: 0 auto; line-height: 1.5;">Thank you for your interest. Our design team will be in touch shortly with next steps for your project.</p>
          </div>
        `;

        setTimeout(() => {
          closeAllModals();
          setTimeout(() => {
            contactForm.innerHTML = formContent;
            contactForm.reset();
          }, 400);
        }, 2400);
      });
    }

    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
    if (galleryItems.length > 0) {
      let activeIndex = 2;

      function setActiveGalleryItem(index) {
        if (index < 0 || index >= galleryItems.length) return;
        activeIndex = index;

        galleryItems.forEach((item, idx) => {
          const isActive = idx === activeIndex;
          const video = item.querySelector('video');

          item.classList.toggle('active', isActive);
          item.setAttribute('aria-expanded', isActive ? 'true' : 'false');

          if (!video) return;

          if (isActive) {
            video.muted = true;
            video.loop = true;
            video.preload = 'metadata';
            video.currentTime = 0;
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      }

      galleryItems.forEach((item, index) => {
        const video = item.querySelector('video');
        if (video) {
          video.muted = true;
          video.loop = true;
          video.preload = 'metadata';
          video.pause();
          video.currentTime = 0;
        }

        item.addEventListener('click', () => setActiveGalleryItem(index));
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveGalleryItem(index);
          }
        });
      });

      document.addEventListener('keydown', (event) => {
        if (document.activeElement && document.activeElement.classList.contains('gallery-item')) {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            setActiveGalleryItem((activeIndex + 1) % galleryItems.length);
            galleryItems[activeIndex].focus();
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setActiveGalleryItem((activeIndex - 1 + galleryItems.length) % galleryItems.length);
            galleryItems[activeIndex].focus();
          }
        }
      });

      setActiveGalleryItem(activeIndex);
    }

    const serviceCards = Array.from(document.querySelectorAll('.service-card'));
    if (serviceCards.length > 0) {
      function setActiveServiceCard(activeIndex) {
        serviceCards.forEach((card, idx) => {
          card.classList.toggle('active', idx === activeIndex);
          card.setAttribute('aria-selected', idx === activeIndex ? 'true' : 'false');
        });
      }

      serviceCards.forEach((card, index) => {
        card.addEventListener('click', () => setActiveServiceCard(index));
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveServiceCard(index);
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            const next = (index + 1) % serviceCards.length;
            serviceCards[next].focus();
            setActiveServiceCard(next);
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            const prev = (index - 1 + serviceCards.length) % serviceCards.length;
            serviceCards[prev].focus();
            setActiveServiceCard(prev);
          }
        });
      });
    }

    const stepCards = document.querySelectorAll('.how-step-card');
    stepCards.forEach((card) => {
      card.addEventListener('click', () => {
        stepCards.forEach((item) => {
          item.style.outline = 'none';
        });
        card.style.outline = '2px solid rgba(0, 0, 0, 0.12)';
        setTimeout(() => {
          card.style.outline = 'none';
        }, 1000);
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (event) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#contact') return;
        event.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          if (menuDrawer) menuDrawer.classList.remove('is-open');
        }
      });
    });

    bindFaqAccordion();
  }

  waitForPageAssets();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
