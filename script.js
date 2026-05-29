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
let gameActive = false;

let spawnRate = 2000; 
let lastSpawnTime = 0;

function createProjectile() {
    let spawnAngle = Math.random() * Math.PI * 2;
    let spawnDistance = 400; 
    
    // Distribuição: 40% Quadrado, 25% Triângulo, 20% Coração, 15% Bumerangue
    let rand = Math.random();
    let type = 'square';
    if (rand > 0.4 && rand <= 0.65) type = 'triangle';
    if (rand > 0.65 && rand <= 0.85) type = 'heart';
    if (rand > 0.85) type = 'boomerang';

    let startX = centerX + Math.cos(spawnAngle) * spawnDistance;
    let startY = centerY + Math.sin(spawnAngle) * spawnDistance;
    let angleToCenter = Math.atan2(centerY - startY, centerX - startX);

    if (type === 'square') {
        return {
            type: 'square',
            x: startX,
            y: startY,
            vx: Math.cos(angleToCenter) * 2.5,
            vy: Math.sin(angleToCenter) * 2.5,
            size: 15,
            angle: Math.atan2(startY - centerY, startX - centerX)
        };
    } else if (type === 'triangle') {
        return {
            type: 'triangle',
            distance: spawnDistance,
            angle: Math.atan2(startY - centerY, startX - centerX),
            orbitSpeed: 0.02,
            approachSpeed: 1.2,
            size: 18,
            x: startX,
            y: startY
        };
    } else if (type === 'heart') {
        return {
            type: 'heart',
            x: startX,
            y: startY,
            angle: Math.atan2(startY - centerY, startX - centerX),
            angleToCenter: angleToCenter,
            state: 'moving_in',
            timer: 0,
            size: 15,
            speed: 1.5
        };
    } else if (type === 'boomerang') {
        return {
            type: 'boomerang',
            x: startX,
            y: startY,
            vx: Math.cos(angleToCenter) * 3, // Vai rápido na ida
            vy: Math.sin(angleToCenter) * 3,
            size: 16,
            angle: 0,              // Ângulo visual para ele ficar girando no próprio eixo
            state: 'going_ghost',  // Estados: 'going_ghost' (ida inofensiva), 'returning' (volta perigosa)
            hasCrossedCenter: false
        };
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
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle + Math.PI) * size, y + Math.sin(angle + Math.PI) * size);
    ctx.lineTo(x + Math.cos(angle + 0.5) * size, y + Math.sin(angle + 0.5) * size);
    ctx.lineTo(x + Math.cos(angle - 0.5) * size, y + Math.sin(angle - 0.5) * size);
    ctx.closePath();
    ctx.fill();
}

function drawHeart(x, y, size) {
    ctx.fillStyle = "#ff66cc";
    ctx.beginPath();
    ctx.moveTo(x, y + size); 
    ctx.bezierCurveTo(x - size, y - size/2, x - size, y - size * 1.5, x, y - size/3);
    ctx.bezierCurveTo(x + size, y - size * 1.5, x + size, y - size/2, x, y + size);
    ctx.closePath();
    ctx.fill();
}

// Desenha o Bumerangue (duas linhas marrons cruzadas em formato de V ou X)
function drawBoomerang(x, y, size, spinAngle, isGhost) {
    ctx.save(); // Salva o estado atual do canvas
    ctx.translate(x, y); // Move a origem do desenho para o centro do bumerangue
    ctx.rotate(spinAngle); // Gira o bumerangue no próprio eixo

    // Define a cor: se for fantasma (ida), fica transparente. Na volta, fica marrom sólido.
    ctx.strokeStyle = isGhost ? "rgba(139, 69, 19, 0.25)" : "#8B4513";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Desenha as duas linhas conectadas formando um bumerangue angulado
    ctx.beginPath();
    ctx.moveTo(-size, -size/2);
    ctx.lineTo(0, 0);
    ctx.lineTo(size, -size/2);
    ctx.stroke();

    ctx.restore(); // Restaura o canvas ao normal
}

function drawUI() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Vidas: ${lives}`, 20, 40);
    ctx.fillText(`Pontos: ${score}`, 20, 70);
}

function resetGame() {
    lives = 3;
    score = 0;
    projectiles = [];
    spawnRate = 2000;
    lastSpawnTime = performance.now();
}

function update(currentTime) {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let shieldAngle = Math.atan2(mouseY - centerY, mouseX - centerX);

    if (currentTime - lastSpawnTime > spawnRate) {
        projectiles.push(createProjectile());
        lastSpawnTime = currentTime;
        if (spawnRate > 800) spawnRate -= 40; 
    }

    // Desenhar Jogador
    ctx.beginPath();
    ctx.arc(centerX, centerY, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0077ff";
    ctx.fill();
    ctx.closePath();

    // Desenhar Escudo
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldDistance, shieldAngle - shieldLength, shieldAngle + shieldLength);
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.closePath();

    // Loop de Projéteis
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);

        // --- ATUALIZAÇÃO BASEADA NO TIPO ---
        if (p.type === 'square') {
            p.x += p.vx;
            p.y += p.vy;
            ctx.fillStyle = "#ff3366";
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } 
        else if (p.type === 'triangle') {
            p.angle += p.orbitSpeed;
            p.distance -= p.approachSpeed;
            p.x = centerX + Math.cos(p.angle) * p.distance;
            p.y = centerY + Math.sin(p.angle) * p.distance;
            drawTriangle(p.x, p.y, p.size, p.angle);
        }
        else if (p.type === 'heart') {
            if (p.state === 'moving_in') {
                p.x += Math.cos(p.angleToCenter) * p.speed;
                p.y += Math.sin(p.angleToCenter) * p.speed;
                if (distanceToCenter <= 220) p.state = 'waiting';
            } 
            else if (p.state === 'waiting') {
                p.timer += 1;
                if (p.timer >= 60) {
                    p.state = 'dash';
                    p.speed = 5;
                }
            } 
            else if (p.state === 'dash') {
                p.x += Math.cos(p.angleToCenter) * p.speed;
                p.y += Math.sin(p.angleToCenter) * p.speed;
            }
            p.angle = Math.atan2(p.y - centerY, p.x - centerX);
            drawHeart(p.x, p.y, p.size);
        }
        else if (p.type === 'boomerang') {
            // Faz o bumerangue andar e ficar girando visualmente
            p.x += p.vx;
            p.y += p.vy;
            p.angle += 0.15; // Velocidade de rotação visual das pás

            if (p.state === 'going_ghost') {
                // Se ele estiver muito perto do centro, significa que começou a cruzar o núcleo
                if (distanceToCenter < 10) {
                    p.hasCrossedCenter = true;
                }
                // Depois que ele cruzou o centro e se afastou 180px do outro lado, ele ativa o bumerangue!
                if (p.hasCrossedCenter && distanceToCenter >= 180) {
                    p.state = 'returning';
                    p.vx = -p.vx * 0.65; // Inverte a direção e volta um pouco mais lento para ser justo
                    p.vy = -p.vy * 0.65;
                }
            }

            // Atualiza o ângulo real de posição atual em relação ao centro (fundamental para o escudo detectá-lo)
            p.anglePosition = Math.atan2(p.y - centerY, p.x - centerX);

            // Desenha o bumerangue passando a informação se ele é fantasma ou ativo
            drawBoomerang(p.x, p.y, p.size, p.angle, p.state === 'going_ghost');
        }

        // Re-calcula a distância para a colisão após a movimentação
        distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);

        // --- SISTEMA DE COLISÕES (Ignorado se o bumerangue for fantasma) ---
        if (p.type === 'boomerang' && p.state === 'going_ghost') {
            continue; // Pula os testes de colisão e dano enquanto estiver na fase de ida!
        }

        // Pega o ângulo correto dependendo do objeto
        let currentAngle = p.type === 'boomerang' ? p.anglePosition : p.angle;

        // Colisão com o ESCUDO
        if (distanceToCenter <= shieldDistance + 6 && distanceToCenter >= shieldDistance - 5) {
            let angleDiff = normalizeAngle(shieldAngle - currentAngle);

            if (Math.abs(angleDiff) <= shieldLength) {
                // Bumerangues dão 40 pontos!
                score += p.type === 'boomerang' ? 40 : (p.type === 'heart' ? 30 : (p.type === 'triangle' ? 25 : 10)); 
                projectiles.splice(i, 1);
                continue;
            }
        }

        // Colisão com a BOLA AZUL
        if (distanceToCenter <= playerRadius) {
            lives--;
            projectiles.splice(i, 1);

            if (lives <= 0) {
                gameActive = false;
                gameOverText.textContent = `O núcleo foi destruído! você ganhou ${score} pontos.`;
                gameOverScreen.classList.remove("hidden");
            }
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

startButton.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    gameActive = true;
    resetGame();
    requestAnimationFrame(update);
});

restartButton.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    gameActive = true;
    resetGame();
    requestAnimationFrame(update);
});