import { defineNuxtPlugin } from "#app";
import { nextTick } from "vue";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { getProjects } from "~/utils/sanity.js";

let projects: Array<{ title: string; subtitle: string; image: string; href: string; agency?: { title: string; url?: string } | null }> = [];
let lenis: Lenis | null = null;

export default defineNuxtPlugin(async (nuxtApp) => {
  if (process.client) {
    // Wait for Vue app to be mounted
    nuxtApp.hook('app:mounted', async () => {
      await init();
    });
  }
});

async function init() {
  // Initialize Lenis for smooth scrolling
  lenis = new Lenis({
    duration: 1.2, // Animation duration (higher = slower, smoother)
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
    orientation: 'vertical', // Vertical scroll
    gestureOrientation: 'vertical',
    smoothWheel: true, // Smooth mouse wheel scrolling
    wheelMultiplier: 4, // Increase scroll velocity
    touchMultiplier: 2,
  });

  // Connect Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // Fetch projects from Sanity
  try {
    projects = await getProjects();
    if (projects.length === 0) {
      console.warn('No projects found in Sanity');
      return;
    }
  } catch (error) {
    console.error('Error fetching projects from Sanity:', error);
    return;
  }

  // Wait for DOM to be ready with retry logic
  const trySetup = () => {
    const container = document.querySelector('.outpost .container');
    if (container) {
      setupGallery();
    } else {
      // Retry after a short delay if container not found
      requestAnimationFrame(trySetup);
    }
  };

  // Use nextTick to ensure Vue has rendered
  await nextTick();
  trySetup();
}

function setupGallery() {
  const gallerySection = document.querySelector('.outpost');
  const container = document.querySelector('.outpost .container');
  if (!container || !gallerySection) {
    console.error('Gallery elements not found');
    return;
  }

  // Clear any existing content
  container.innerHTML = '';

  // Create projects from Sanity data
  projects.forEach((project, index) => {
    const projectEl = document.createElement('div');
    projectEl.className = 'project';
    projectEl.dataset.projectIndex = index.toString();
    // Add pointer cursor to closed projects (will be removed when project becomes active)
    projectEl.setAttribute('data-cursor', 'pointer');
    
    const datas = document.createElement('div');
    datas.className = 'datas';
    
    const label = document.createElement('p');
    label.className = 'label';
    label.textContent = project.title || '';
    
    const subtitle = document.createElement('p');
    subtitle.className = 'year';
    subtitle.textContent = project.subtitle || '';
    
    datas.appendChild(label);
    datas.appendChild(subtitle);
    
    const img = document.createElement('img');
    img.className = 'media';
    img.src = project.image;
    img.alt = project.title;
    img.setAttribute('data-cursor', 'pointer');
    
    projectEl.appendChild(datas);
    projectEl.appendChild(img);
    container.appendChild(projectEl);
    
    // Hover handler on entire project - turns title white
    projectEl.addEventListener('mouseenter', () => {
      projectEl.classList.add('hovered');
    });
    
    projectEl.addEventListener('mouseleave', () => {
      projectEl.classList.remove('hovered');
    });
    
    // Click handler on image only - opens preview modal
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (project.href && project.href !== '#') {
        openPreview(project.href, project.title, project.agency);
      }
    });
    
    // Click handler on project (but not image) - scrolls to project
    projectEl.addEventListener('click', (e) => {
      // Don't handle if clicking on image (image handler will handle it)
      if ((e.target as HTMLElement).classList.contains('media')) {
        return;
      }
      e.preventDefault();
      scrollToProject(index, projects.length);
    });
  });
  
  // Create modal on first setup
  createModal();

  // Register ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);
  
  // Refresh ScrollTrigger after Lenis is initialized
  ScrollTrigger.refresh();

  // Only on large devices
  const mm = gsap.matchMedia();
  mm.add("(min-width: 769px)", () => {
    const projectElements = document.querySelectorAll('.outpost .project');
    if (projectElements.length === 0) return;
    
    projectElements[0].classList.add('on');
    projectElements[0].removeAttribute('data-cursor'); // Remove pointer cursor from first active project
    const numProjects = projectElements.length;
    let currentProject = projectElements[0] as HTMLElement;

    const pinHeight = document.querySelector('.outpost .pin-height') as HTMLElement;
    if (!pinHeight) return;

    // Calculate pin-height based on number of projects
    // Each project gets roughly 100vh of scroll space, minimum 300vh
    const calculatedHeight = Math.max(numProjects * 100, 300);
    pinHeight.style.height = `${calculatedHeight}vh`;

    const dist = (container as HTMLElement).clientWidth - document.body.clientWidth;
    const footer = document.querySelector('footer') as HTMLElement;

    // Animate container horizontal movement
    gsap.to(container, {
      x: -dist,
      ease: 'none',
      scrollTrigger: {
        trigger: pinHeight,
        pin: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          // Determines the closest project based on scroll progress
          const closestIndex = Math.round(self.progress * (numProjects - 1));
          const closestProject = projectElements[closestIndex] as HTMLElement;
          
          // If the closest project has changed
          if (closestProject !== currentProject) {
            currentProject.classList.remove('on');
            currentProject.setAttribute('data-cursor', 'pointer'); // Add pointer cursor back to closed project
            closestProject.classList.add('on');
            closestProject.removeAttribute('data-cursor'); // Remove pointer cursor from active project
            currentProject = closestProject;
          }
        }
      }
    });

    // Animate footer rotation based on scroll progress
    if (footer) {
      gsap.to(footer, {
        rotation: 360,
        ease: 'none',
        scrollTrigger: {
          trigger: pinHeight,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true
        }
      });
    }
  });
  
  // Function to scroll to a specific project
  function scrollToProject(projectIndex: number, totalProjects: number) {
    if (totalProjects === 0 || !lenis) return;
    if (totalProjects === 1) {
      // If only one project, scroll to start
      const pinHeight = document.querySelector('.outpost .pin-height') as HTMLElement;
      if (pinHeight) {
        lenis.scrollTo(pinHeight.offsetTop, {
          duration: 0.6,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }
      return;
    }
    
    const pinHeight = document.querySelector('.outpost .pin-height') as HTMLElement;
    if (!pinHeight) return;

    // Calculate the scroll progress needed (0 to 1)
    const targetProgress = projectIndex / totalProjects;
    
    // Get the pin-height element's position and height
    const pinHeightHeight = pinHeight.offsetHeight;
    const startY = pinHeight.offsetTop;
    
    // Calculate target scroll position
    const targetScrollY = startY + (pinHeightHeight * targetProgress);
    
    // Use Lenis for smooth scroll (faster duration for quicker navigation)
    lenis.scrollTo(targetScrollY, {
      duration: 0.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
  }
  
  // Make scrollToProject available globally
  (window as any).scrollToProject = scrollToProject;
}

// Create modal for website preview
let modal: HTMLElement | null = null;
let modalContent: HTMLElement | null = null;
let modalIframe: HTMLIFrameElement | null = null;
let originalHeader: HTMLElement | null = null;
let originalHeaderContent: HTMLElement | null = null;
let originalHeaderLink: HTMLElement | null = null;
let modalTitle: HTMLElement | null = null;
let closeButton: HTMLElement | null = null;

function createModal() {
  if (modal) return; // Modal already exists
  
  const gallerySection = document.querySelector('.outpost');
  if (!gallerySection) return;

  modal = document.createElement('div');
  modal.className = 'preview-modal';
  
  modalContent = document.createElement('div');
  modalContent.className = 'preview-modal-content';
  
  modalIframe = document.createElement('iframe');
  modalIframe.className = 'preview-iframe';
  
  modalContent.appendChild(modalIframe);
  modal.appendChild(modalContent);
  gallerySection.appendChild(modal);

  // Get reference to original header
  originalHeader = document.querySelector('.outpost-header') as HTMLElement;
  if (originalHeader) {
    originalHeaderContent = originalHeader.querySelector('p') as HTMLElement;
    originalHeaderLink = originalHeader.querySelector('a') as HTMLElement;
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePreview();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closePreview();
    }
  });
}

function openPreview(url: string, title: string, agency?: { title: string; url?: string } | null) {
  createModal();
  if (!modalIframe || !modal || !modalContent || !originalHeader) return;
  
  // Set iframe to invisible initially
  gsap.set(modalIframe, { opacity: 0 });
  
  // Prepare header content (but keep it invisible)
  if (originalHeader && originalHeaderContent && originalHeaderLink) {
    // Clear existing content
    originalHeaderContent!.innerHTML = '';
    originalHeaderContent!.className = 'preview-modal-title';
    
    // If agency exists and has title, show "Design: [Agency name]" with or without link
    if (agency && typeof agency === 'object' && agency.title) {
      const designText = document.createTextNode('Design: ');
      originalHeaderContent!.appendChild(designText);
      
      // If URL exists, create a link; otherwise just show the agency name as text
      if (agency.url) {
        const agencyLink = document.createElement('a');
        agencyLink.href = agency.url;
        agencyLink.target = '_blank';
        agencyLink.rel = 'noopener noreferrer';
        agencyLink.textContent = agency.title;
        agencyLink.style.textDecoration = 'none';
        agencyLink.style.color = 'inherit';
        originalHeaderContent!.appendChild(agencyLink);
      } else {
        const agencyText = document.createTextNode(agency.title);
        originalHeaderContent!.appendChild(agencyText);
      }
    } else {
      originalHeaderContent!.textContent = title || '';
    }
    
    // Remove old link and create/update close button
    if (originalHeaderLink && originalHeader.contains(originalHeaderLink)) {
      originalHeader.removeChild(originalHeaderLink);
    }
    
    // Remove existing close button if it exists (to avoid duplicates)
    if (closeButton && originalHeader.contains(closeButton)) {
      originalHeader.removeChild(closeButton);
    }
    
    // Create new close button
    closeButton = document.createElement('button');
    closeButton.className = 'preview-close';
    closeButton.textContent = 'Close';
    closeButton.setAttribute('aria-label', 'Close preview');
    closeButton.addEventListener('click', closePreview);
    originalHeader.appendChild(closeButton);
    
    // Set new header content and close button to invisible initially
    gsap.set([originalHeaderContent, closeButton], { opacity: 0 });
  }
  
  // Activate modal and fade in background simultaneously with header fade out
  modal.classList.add('active');
  
  // Create timeline to coordinate animations
  const tl = gsap.timeline();
  
  // Step 1: Fade in background and fade out original header content simultaneously
  tl.to(modal, {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out'
  })
  .to([originalHeaderContent, originalHeaderLink], {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  }, 0) // Start at same time as background fade in
  
  // Step 2: Once both complete, fade in iframe and project details simultaneously
  .call(() => {
    // Load iframe
    modalIframe!.src = url;
  })
  .to([modalIframe, originalHeaderContent, closeButton], {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out'
  });
}

function closePreview() {
  if (!modalContent || !modal || !modalIframe || !originalHeader) return;
  
  // Create timeline to coordinate closing animations (reverse of opening)
  const tl = gsap.timeline();
  
  // Step 1: Fade out iframe and project details simultaneously
  tl.to(modalIframe, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  })
  .to([originalHeaderContent, closeButton], {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  }, 0) // Start at same time as iframe fade out
  
  // Step 2: Once both complete, fade out background and fade in original header simultaneously
  .call(() => {
    if (!originalHeader || !originalHeaderContent) return;
    
    // Restore original content
    originalHeaderContent!.textContent = 'Outpost';
    originalHeaderContent!.className = '';
    
    // Remove close button and restore original link
    if (closeButton && originalHeader.contains(closeButton)) {
      originalHeader.removeChild(closeButton);
      closeButton = null;
    }
    if (originalHeaderLink) {
      // Only append if not already in the DOM
      if (!originalHeader.contains(originalHeaderLink)) {
        originalHeader.appendChild(originalHeaderLink);
      }
      // Set link to invisible initially for fade in
      gsap.set(originalHeaderLink, { opacity: 0 });
    }
    
    // Set original header content to invisible initially for fade in
    gsap.set(originalHeaderContent, { opacity: 0 });
  })
  .to(modal, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  });
  
  // Fade in original header content (and link if it exists)
  const elementsToFadeIn = [originalHeaderContent];
  if (originalHeaderLink) {
    elementsToFadeIn.push(originalHeaderLink);
  }
  tl.to(elementsToFadeIn, {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out'
  }, '<') // Start at same time as background fade out
  .call(() => {
    // Cleanup after animations complete
    modal?.classList.remove('active');
    modalIframe!.src = '';
    // Reset opacity for next open
    gsap.set(modalIframe, { opacity: 1 });
  });
}
