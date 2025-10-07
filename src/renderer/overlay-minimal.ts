// Minimal overlay.ts for testing button click logging
console.log('🚀 OVERLAY.TS SCRIPT STARTING TO LOAD!');
console.log('📍 Timestamp:', new Date().toISOString());

// Simple test to verify button clicks work
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded fired');
  
  // Test if we can find and attach to buttons
  const testBtn = document.getElementById('test-btn');
  const resetBtn = document.getElementById('reset-btn');
  const nextBtn = document.getElementById('next-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  console.log('�� Button elements found:', {
    testBtn: !!testBtn,
    resetBtn: !!resetBtn,
    nextBtn: !!nextBtn,
    pauseBtn: !!pauseBtn
  });
  
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      console.log('🧪 TEST BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
      console.log('✅ Button click handler is working!');
      
      // Visual feedback
      testBtn.style.background = 'rgba(255, 0, 0, 0.6)';
      setTimeout(() => {
        testBtn.style.background = 'rgba(76, 175, 80, 0.4)';
      }, 200);
    });
    console.log('✅ Test button event listener attached');
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      console.log('🔄 RESET BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('▶️ NEXT BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      console.log('⏸️ PAUSE BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
    });
  }
  
  console.log('🎉 OVERLAY BUTTON EVENT LISTENERS ATTACHED!');
});

console.log('🎯 OVERLAY.TS SCRIPT FULLY LOADED!');
console.log('📍 Timestamp:', new Date().toISOString());
