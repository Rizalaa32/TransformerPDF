// Main Application Entry Point

import { initMerger } from './modules/pdfMerger.js';
import { initPageManager } from './modules/pageManager.js';
import { initWordToPdf } from './modules/wordToPdf.js';

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Logic
    const navButtons = document.querySelectorAll('.nav-btn');
    const modules = document.querySelectorAll('.module-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            navButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            // Hide all modules
            modules.forEach(mod => {
                mod.classList.remove('active');
                mod.classList.add('hidden');
            });

            // Show targeted module
            const targetId = btn.getAttribute('data-target');
            const targetModule = document.getElementById(targetId);
            if (targetModule) {
                targetModule.classList.remove('hidden');
                // slight delay to allow display:block to apply before opacity transition
                setTimeout(() => targetModule.classList.add('active'), 10);
            }
        });
    });

    // Initialize Modules
    initMerger();
    initPageManager();
    initWordToPdf();
});
