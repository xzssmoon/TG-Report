const countSlider = document.getElementById('count');
const countValue = document.getElementById('countValue');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');

countSlider.addEventListener('input', () => {
    countValue.textContent = countSlider.value;
});

function showStatus(type, message) {
    statusDiv.className = 'status ' + type;
    statusDiv.textContent = message;
}

function validateTarget(target) {
    if (!target) return false;
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
    return phoneRegex.test(target) || usernameRegex.test(target);
}
