document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Simple countdown timer for demo
    const timeElement = document.querySelector('.time');
    let minutes = 45;
    let seconds = 0;

    if (timeElement) {
        setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    minutes = 45; // Reset for demo
                } else {
                    minutes--;
                    seconds = 59;
                }
            } else {
                seconds--;
            }

            const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
            const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
            timeElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
        }, 1000);
    }
    
    // Check-in button interaction
    const checkInBtn = document.querySelector('.check-in-btn');
    if (checkInBtn) {
        checkInBtn.addEventListener('click', function() {
            this.textContent = 'Check-in Confirmed!';
            this.style.background = 'var(--accent)';
            minutes = 45;
            seconds = 0;
            
            setTimeout(() => {
                this.textContent = 'I am Safe';
                this.style.background = 'var(--primary)';
            }, 3000);
        });
    }
});
