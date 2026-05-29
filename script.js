const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
let gameActive = true;

let spawnRate = 2000; 
let lastSpawnTime = 0;

function createProjectile() {
    let spawnAngle = Math.random() * Math.PI * 2;
    let spawnDistance = 400; 
    
    // Agora sorteamos entre 3 tipos: 50% Quadrado, 30% Triângulo, 20% Coração
    let rand = Math.random();
    let type = 'square';
    if (rand > 0.5 && rand <= 0.8) type = 'triangle';
    if (rand > 0.8) type = 'heart';

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
            state: 'moving_in', // Estados: 'moving_in', 'waiting', 'dash'
            timer: 0,           // Contador de quadros para a pausa
            size: 15,
            speed: 1.5          // Velocidade inicial lenta
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

// Desenha o formato de coração usando curvas matemáticas
function drawHeart(x, y, size) {
    ctx.fillStyle = "#ff66cc"; // Rosa
    ctx.beginPath();
    // Ponto inferior do coração
    ctx.moveTo(x, y + size); 
    // Curva da esquerda
    ctx.bezierCurveTo(x - size, y - size/2, x - size, y - size * 1.5, x, y - size/3);
    // Curva da direita
    ctx.bezierCurveTo(x + size, y - size * 1.5, x + size, y - size/2, x, y + size);
    ctx.closePath();
    ctx.fill();
}

function drawUI() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Vidas: ${lives}`, 20, 40);
    ctx.fillText(`Pontos: ${score}`, 20, 70);
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
            let distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);

            // Máquina de estados do Coração
            if (p.state === 'moving_in') {
                // Avança um pouco para dentro da tela
                p.x += Math.cos(p.angleToCenter) * p.speed;
                p.y += Math.sin(p.angleToCenter) * p.speed;
                
                // Quando chega a uma distância de 200px do centro, ele para
                if (distanceToCenter <= 220) {
                    p.state = 'waiting';
                }
            } 
            else if (p.state === 'waiting') {
                p.timer += 1;
                // Fica parado por cerca de 1 segundo (60 quadros)
                if (p.timer >= 60) {
                    p.state = 'dash';
                    p.speed = 5; // Velocidade de arranque bem alta!
                }
            } 
            else if (p.state === 'dash') {
                // Arranca em direção ao centro
                p.x += Math.cos(p.angleToCenter) * p.speed;
                p.y += Math.sin(p.angleToCenter) * p.speed;
            }

            // Atualiza o ângulo constante de onde ele está em relação ao centro (para a colisão do escudo)
            p.angle = Math.atan2(p.y - centerY, p.x - centerX);

            drawHeart(p.x, p.y, p.size);
        }

        // --- DETECÇÃO DE DISTÂNCIA E COLISÕES ---
        let distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);

        // Colisão com o ESCUDO
        if (distanceToCenter <= shieldDistance + 6 && distanceToCenter >= shieldDistance - 6) {
            let angleDiff = normalizeAngle(shieldAngle - p.angle);

            if (Math.abs(angleDiff) <= shieldLength) {
                // Corações dão 30 pontos!
                score += p.type === 'heart' ? 30 : (p.type === 'triangle' ? 25 : 10); 
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
                alert(`Game Over! Pontuação final: ${score}`);
                window.location.reload();
            }
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

requestAnimationFrame(update);