const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const playerRadius = 20;
const shieldDistance = 40; 
const shieldLength = 0.5; 

let mouseX = centerX;
let mouseY = centerY;

let lives = 3;
let score = 0;
let projectiles = [];
let particles = []; 
let gameActive = false;

let isCoreExploding = false;
let gameOverDelayTimer = 0;

let spawnRate = 2000; 
let lastSpawnTime = 0;

const COLORS = {
    square: "#ff3366",    
    triangle: "#ffcc00",  
    heart: "#ff66cc",     
    boomerang: "#8B4513",
    pale_line: "#e0e0e0",
    purple_hex: "#9933ff",
    white_star: "#ffffff", 
    star_clone: "rgba(255, 255, 255, 0.25)" 
};

// --- FUNÇÃO DE CRIAÇÃO COM SISTEMA DE BALANCEAMENTO POR PONTOS ---
function createProjectile() {
    let spawnAngle = Math.random() * Math.PI * 2;
    let spawnDistance = 400; 
    
    let startX = centerX + Math.cos(spawnAngle) * spawnDistance;
    let startY = centerY + Math.sin(spawnAngle) * spawnDistance;
    let angleToCenter = Math.atan2(centerY - startY, centerX - startX);

    // Sistema de liberação progressiva com base no Score
    let availableTypes = ['square']; 

    if (score >= 40) {
        availableTypes.push('triangle');
    }
    if (score >= 100) {
        availableTypes.push('heart');
    }
    if (score >= 180) {
        availableTypes.push('boomerang');
    }
    if (score >= 260) {
        availableTypes.push('pale_line');
    }
    if (score >= 360) {
        availableTypes.push('white_star');
    }
    if (score >= 480) {
        availableTypes.push('purple_hex');
    }

    let randomObjectIndex = Math.floor(Math.random() * availableTypes.length);
    let type = availableTypes[randomObjectIndex];

    // Funil de dificuldade extrema após 600 pontos
    if (score >= 600 && type === 'square' && Math.random() > 0.5) {
        let advancedTypes = ['boomerang', 'purple_hex', 'white_star'];
        type = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
    }

    // Estruturação dos objetos
    if (type === 'square') {
        return {
            type: 'square', x: startX, y: startY,
            vx: Math.cos(angleToCenter) * 2.5,
            vy: Math.sin(angleToCenter) * 2.5,
            size: 15, angle: Math.atan2(startY - centerY, startX - centerX)
        };
    } else if (type === 'triangle') {
        return {
            type: 'triangle', distance: spawnDistance,
            angle: Math.atan2(startY - centerY, startX - centerX),
            orbitSpeed: 0.02, approachSpeed: 1.2, size: 18,
            x: startX, y: startY
        };
    } else if (type === 'heart') {
        return {
            type: 'heart', x: startX, y: startY,
            angle: Math.atan2(startY - centerY, startX - centerX),
            angleToCenter: angleToCenter, state: 'moving_in',
            timer: 0, size: 15, speed: 1.5
        };
    } else if (type === 'boomerang') {
        return {
            type: 'boomerang', x: startX, y: startY,
            vx: Math.cos(angleToCenter) * 3, vy: Math.sin(angleToCenter) * 3,
            size: 16, angle: 0, state: 'going_ghost', hasCrossedCenter: false
        };
    } else if (type === 'pale_line') {
        return {
            type: 'pale_line', x: startX, y: startY,
            vx: Math.cos(angleToCenter) * 1.0, vy: Math.sin(angleToCenter) * 1.0,
            length: 25, angle: Math.atan2(startY - centerY, startX - centerX),
            angleToCenter: angleToCenter
        };
    } else if (type === 'purple_hex') {
        let weakLineIndex = Math.floor(Math.random() * 6);
        return {
            type: 'purple_hex', x: centerX, y: centerY,
            radius: spawnDistance, shrinkSpeed: 1.5,     
            weakLineIndex: weakLineIndex, angle: Math.random() * Math.PI * 2 
        };
    } else if (type === 'white_star') {
        return {
            type: 'white_star', x: startX, y: startY,
            vx: Math.cos(angleToCenter) * 1.6, vy: Math.sin(angleToCenter) * 1.6,
            size: 20, angle: Math.atan2(startY - centerY, startX - centerX),
            id: Date.now() + Math.random()
        };
    }
}

function createExplosion(x, y, color) {
    const particleCount = 12; 
    for (let i = 0; i < particleCount; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1; 
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 2, 
            color: color, alpha: 1, 
            decay: Math.random() * 0.03 + 0.015 
        });
    }
}

function createCoreSupernova() {
    const particleCount = 80; 
    for (let i = 0; i < particleCount; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6 + 1.5; 
        let color = Math.random() > 0.4 ? "#00ffff" : "#ccffff";
        particles.push({
            x: centerX, y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 6 + 3, color: color,
            alpha: 1, decay: Math.random() * 0.01 + 0.008 
        });
    }
}

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

function drawTriangle(x, y, size, angle) {
    ctx.fillStyle = COLORS.triangle;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle + Math.PI) * size, y + Math.sin(angle + Math.PI) * size);
    ctx.lineTo(x + Math.cos(angle + 0.5) * size, y + Math.sin(angle + 0.5) * size);
    ctx.lineTo(x + Math.cos(angle - 0.5) * size, y + Math.sin(angle - 0.5) * size);
    ctx.closePath(); ctx.fill();
}

// FORMATO NOVO DO CORAÇÃO ROSA
function drawHeart(x, y, size) {
    ctx.fillStyle = COLORS.heart;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6); 
    ctx.lineTo(x + size * 0.6, y - size);
    ctx.lineTo(x + size, y - size * 0.4);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y - size * 0.4);
    ctx.lineTo(x - size * 0.6, y - size);
    ctx.closePath(); ctx.fill();
}

function drawBoomerang(x, y, size, spinAngle, isGhost) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spinAngle);
    ctx.strokeStyle = isGhost ? "rgba(139, 69, 19, 0.25)" : COLORS.boomerang;
    ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-size, -size/2); ctx.lineTo(0, 0); ctx.lineTo(size, -size/2);
    ctx.stroke(); ctx.restore();
}

function drawPaleLine(x, y, length, angleToCenter, currentTime) {
    ctx.save();
    let timeTick = currentTime % 2500;
    let alpha = timeTick < 500 ? 0.8 : 0.03; 
    ctx.strokeStyle = `rgba(224, 224, 224, ${alpha})`;
    ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angleToCenter) * (length / 2), y - Math.sin(angleToCenter) * (length / 2));
    ctx.lineTo(x + Math.cos(angleToCenter) * (length / 2), y + Math.sin(angleToCenter) * (length / 2));
    ctx.stroke(); ctx.restore();
}

function drawPurpleHexagon(x, y, radius, spinAngle, weakLineIndex) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spinAngle); ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
        let angleStart = (i * Math.PI * 2) / 6;
        let angleEnd = ((i + 1) * Math.PI * 2) / 6;
        ctx.strokeStyle = (i === weakLineIndex) ? "rgba(139, 69, 19, 1.0)" : `rgba(153, 51, 255, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angleStart) * radius, Math.sin(angleStart) * radius);
        ctx.lineTo(Math.cos(angleEnd) * radius, Math.sin(angleEnd) * radius);
        ctx.stroke();
    } ctx.restore();
}

// FORMATO NOVO DA ESTRELA BRANCA SHURIKEN
function drawWhiteStar(x, y, size, angle, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.3, -size * 0.3);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.3, size * 0.3);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.3, -size * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
}

function drawBackgroundGrid() {
    ctx.strokeStyle = "rgba(0, 255, 136, 0.08)"; ctx.lineWidth = 1; let gridSize = 40; 
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

// NOVO GRADIENTE RADIAL INTERNO DE NEBLINA
function drawEdgeFog(currentTime) {
    ctx.save();
    let pulse = Math.sin(currentTime / 800) * 15;
    let innerRadius = 220 + pulse; 
    let outerRadius = 380 + pulse;

    let gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
    gradient.addColorStop(0, "rgba(180, 40, 40, 0.0)");  
    gradient.addColorStop(0.5, "rgba(180, 40, 40, 0.25)"); 
    gradient.addColorStop(1, "rgba(180, 40, 40, 0.65)");   

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawUI() {
    ctx.fillStyle = "white"; ctx.font = "bold 16px 'Orbitron', sans-serif"; ctx.fillText(`VIDAS: ${lives < 0 ? 0 : lives}`, 35, 55); ctx.fillText(`PONTOS: ${score}`, 35, 85);
}

function resetGame() {
    lives = 3; score = 0; projectiles = []; particles = []; isCoreExploding = false; gameOverDelayTimer = 0; spawnRate = 2000; lastSpawnTime = performance.now();
}

function update(currentTime) {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundGrid(); drawEdgeFog(currentTime); 
    let shieldAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    
    if (!isCoreExploding && (currentTime - lastSpawnTime > spawnRate)) {
        projectiles.push(createProjectile());
        lastSpawnTime = currentTime;
        if (spawnRate > 800) spawnRate -= 40; 
    }
    
    if (!isCoreExploding) {
        ctx.save(); ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(centerX, centerY, playerRadius, 0, Math.PI * 2); ctx.fillStyle = "#ccffff"; ctx.fill(); ctx.closePath(); ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(centerX, centerY, playerRadius, 0, Math.PI * 2); ctx.strokeStyle = "#0077ff"; ctx.lineWidth = 3; ctx.stroke(); ctx.closePath(); ctx.restore();
        ctx.beginPath(); ctx.arc(centerX, centerY, shieldDistance, shieldAngle - shieldLength, shieldAngle + shieldLength); ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 6; ctx.stroke(); ctx.closePath();
    } else {
        gameOverDelayTimer += 1;
        if (gameOverDelayTimer >= 90) { 
            gameActive = false; gameOverText.textContent = `O núcleo foi destruído! você ganhou ${score} pontos.`; gameOverScreen.classList.remove("hidden"); return; 
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);

        if (p.type === 'square') { p.x += p.vx; p.y += p.vy; ctx.fillStyle = COLORS.square; ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); } 
        else if (p.type === 'triangle') { p.angle += p.orbitSpeed; p.distance -= p.approachSpeed; p.x = centerX + Math.cos(p.angle) * p.distance; p.y = centerY + Math.sin(p.angle) * p.distance; drawTriangle(p.x, p.y, p.size, p.angle); }
        else if (p.type === 'heart') {
            if (p.state === 'moving_in') { p.x += Math.cos(p.angleToCenter) * p.speed; p.y += Math.sin(p.angleToCenter) * p.speed; if (distanceToCenter <= 220) p.state = 'waiting'; } else if (p.state === 'waiting') { p.timer += 1; if (p.timer >= 60) { p.state = 'dash'; p.speed = 5; } } else if (p.state === 'dash') { p.x += Math.cos(p.angleToCenter) * p.speed; p.y += Math.sin(p.angleToCenter) * p.speed; }
            p.angle = Math.atan2(p.y - centerY, p.x - centerX); drawHeart(p.x, p.y, p.size);
        }
        else if (p.type === 'boomerang') {
            p.x += p.vx; p.y += p.vy; p.angle += 0.15;
            if (p.state === 'going_ghost') { if (distanceToCenter < 10) p.hasCrossedCenter = true; if (p.hasCrossedCenter && distanceToCenter >= 180) { p.state = 'returning'; p.vx = -p.vx * 0.65; p.vy = -p.vy * 0.65; } }
            p.anglePosition = Math.atan2(p.y - centerY, p.x - centerX); drawBoomerang(p.x, p.y, p.size, p.angle, p.state === 'going_ghost');
        }
        else if (p.type === 'pale_line') { p.x += p.vx; p.y += p.vy; drawPaleLine(p.x, p.y, p.length, p.angleToCenter, currentTime); }
        else if (p.type === 'purple_hex') { p.radius -= p.shrinkSpeed; p.angle += 0.005; drawPurpleHexagon(p.x, p.y, p.radius, p.angle, p.weakLineIndex); }
        else if (p.type === 'white_star') {
            p.x += p.vx; p.y += p.vy; p.angle += 0.03;
            drawWhiteStar(p.x, p.y, p.size/2, p.angle, COLORS.white_star);
            let cloneX = centerX - (p.x - centerX);
            let cloneY = centerY - (p.y - centerY);
            drawWhiteStar(cloneX, cloneY, p.size/2, -p.angle, COLORS.star_clone);
        }

        distanceToCenter = (p.type === 'purple_hex') ? p.radius : Math.hypot(p.x - centerX, p.y - centerY);
        if (p.type === 'boomerang' && p.state === 'going_ghost') continue;

        // SISTEMA DE COLISÕES (Escudo)
        if (!isCoreExploding && distanceToCenter <= shieldDistance + 6 && distanceToCenter >= shieldDistance - 5) {
            let isHex = (p.type === 'purple_hex');
            let isStar = (p.type === 'white_star');
            
            let currentAngle;
            if (isHex) {
                currentAngle = normalizeAngle(p.angle + ((p.weakLineIndex + 0.5) * Math.PI * 2) / 6);
            } else if (isStar) {
                currentAngle = Math.atan2(p.y - centerY, p.x - centerX);
            } else {
                currentAngle = (p.type === 'boomerang' ? p.anglePosition : p.angle);
            }

            let angleDiff = normalizeAngle(shieldAngle - currentAngle);
            let collisionThreshold = isHex ? 0.25 : shieldLength; 

            if (Math.abs(angleDiff) <= collisionThreshold) {
                createExplosion(p.x, p.y, isHex ? COLORS.purple_hex : (isStar ? "#ffffff" : COLORS[p.type]));
                score += isHex ? 50 : (p.type === 'white_star' ? 20 : (p.type === 'pale_line' ? 20 : (p.type === 'boomerang' ? 40 : (p.type === 'heart' ? 30 : (p.type === 'triangle' ? 25 : 10))))); 
                projectiles.splice(i, 1);
                continue;
            }
        }

        // Dano no Núcleo
        if (!isCoreExploding && distanceToCenter <= playerRadius) {
            if (lives - 1 <= 0) { isCoreExploding = true; createCoreSupernova(); projectiles.splice(i, 1); lives = 0; } else { createExplosion(p.x, p.y, (p.type === 'pale_line' || p.type === 'white_star') ? "#ffffff" : "#00ffff"); lives--; projectiles.splice(i, 1); }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let part = particles[i]; part.x += part.vx; part.y += part.vy; part.alpha -= part.decay;
        if (part.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = part.alpha; ctx.fillStyle = part.color; ctx.fillRect(part.x - part.size/2, part.y - part.size/2, part.size, part.size); ctx.restore();
    }
    drawUI(); requestAnimationFrame(update);
}

startButton.addEventListener("click", () => { startScreen.classList.add("hidden"); gameActive = true; resetGame(); requestAnimationFrame(update); });
restartButton.addEventListener("click", () => { gameOverScreen.classList.add("hidden"); gameActive = true; resetGame(); requestAnimationFrame(update); });