const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const playerRadius = 20;
const shieldDistance = 40; 
const shieldLength = 0.5;  // Largura do escudo em radianos (aprox. 30 graus para cada lado)

let mouseX = centerX;
let mouseY = centerY;

// Criamos uma função para gerar um projétil vindo na direção correta do centro
function createProjectile() {
    // Escolhe um ângulo aleatório de onde o projétil vai nascer (0 a 360 graus)
    let spawnAngle = Math.random() * Math.PI * 2;
    
    // Coloca ele um pouco para fora das bordas do canvas (distância de 400 pixels do centro)
    let spawnDistance = 400; 
    let startX = centerX + Math.cos(spawnAngle) * spawnDistance;
    let startY = centerY + Math.sin(spawnAngle) * spawnDistance;

    // Calcula a direção em direção ao centro (vetor unitário)
    let angleToCenter = Math.atan2(centerY - startY, centerX - startX);
    let velocityX = Math.cos(angleToCenter) * 2; // '2' é a velocidade
    let velocityY = Math.sin(angleToCenter) * 2;

    return {
        x: startX,
        y: startY,
        vx: velocityX,
        vy: velocityY,
        size: 15,
        // Guarda o ângulo de aproximação para testar a colisão depois
        angle: Math.atan2(startY - centerY, startX - centerX)
    };
}

// Inicializa o primeiro projétil
let projectile = createProjectile();

// Atualiza o mouse
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

// Normaliza ângulos para ficarem entre -PI e PI (ajuda a comparar os ângulos depois)
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. ÂNGULO DO ESCUDO (baseado no mouse)
    let shieldAngle = Math.atan2(mouseY - centerY, mouseX - centerX);

    // 2. DESENHAR JOGADOR (Bola Azul)
    ctx.beginPath();
    ctx.arc(centerX, centerY, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0077ff";
    ctx.fill();
    ctx.closePath();

    // 3. DESENHAR ESCUDO (Linha Verde)
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldDistance, shieldAngle - shieldLength, shieldAngle + shieldLength);
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.closePath();

    // 4. ATUALIZAR E DESENHAR PROJÉTIL
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    ctx.fillStyle = "#ff3366";
    ctx.fillRect(projectile.x - projectile.size/2, projectile.y - projectile.size/2, projectile.size, projectile.size);

    // 5. DETECÇÃO DE COLISÃO
    // Calcula a distância atual do projétil até o centro
    let distanceToCenter = Math.hypot(projectile.x - centerX, projectile.y - centerY);

    // Se o projétil atingir o raio do escudo (40px)
    if (distanceToCenter <= shieldDistance + 5 && distanceToCenter >= shieldDistance - 5) {
        
        // Diferença entre o ângulo do escudo e o ângulo de onde o projétil está vindo
        let angleDiff = normalizeAngle(shieldAngle - projectile.angle);

        // Se o projétil bater na área protegida pelo escudo
        if (Math.abs(angleDiff) <= shieldLength) {
            // O escudo defendeu! Reseta o projétil para vir um novo
            projectile = createProjectile();
        }
    }

    // Se o projétil passar direto e atingir a bola azul, reinicia o projétil por enquanto
    if (distanceToCenter <= playerRadius) {
        projectile = createProjectile();
    }

    requestAnimationFrame(update);
}

update();