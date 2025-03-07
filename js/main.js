// Variáveis globais para a cena
let scene, camera, renderer;
let selectedAirplaneType = 'airbus';

// Função para verificar se o Three.js está carregado
function checkThreeJS() {
    return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') {
            resolve();
        } else {
            let attempts = 0;
            const maxAttempts = 10;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof THREE !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('Three.js não foi carregado após várias tentativas'));
                }
            }, 100);
        }
    });
}

// Função principal de inicialização
function init() {
    // Configuração da cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Cor do céu (azul claro)
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Adicionar luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 300, 200);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const auxiliaryLight = new THREE.DirectionalLight(0xffffff, 0.8);
    auxiliaryLight.position.set(-100, 200, -200);
    scene.add(auxiliaryLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemiLight);

    // Criar o chão com textura
    const textureLoader = new THREE.TextureLoader();
    
    // Criar textura procedural para as montanhas
    function createRockTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Cor base cinza escuro
        ctx.fillStyle = '#404040';
        ctx.fillRect(0, 0, 128, 128);

        // Adicionar detalhes em pixel art
        for (let y = 0; y < 128; y += 8) {
            for (let x = 0; x < 128; x += 8) {
                // Variação aleatória de cor
                const shade = Math.floor(Math.random() * 40);
                ctx.fillStyle = `rgb(${80 + shade}, ${80 + shade}, ${80 + shade})`;
                ctx.fillRect(x, y, 8, 8);

                // Adicionar alguns pixels mais claros para textura
                if (Math.random() > 0.7) {
                    ctx.fillStyle = `rgb(${120 + shade}, ${120 + shade}, ${120 + shade})`;
                    ctx.fillRect(x + 2, y + 2, 4, 4);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }
    
    // Carregar todas as texturas necessárias
    const groundTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
    const rockTexture = createRockTexture(); // Usar textura procedural em vez de carregar arquivo
    const buildingTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_diffuse.jpg');
    const windowTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_diffuse.jpg');
    const houseWallTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_bump.jpg');
    const roofTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_roughness.jpg');

    // Configurar repetição das texturas
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(25, 25);
    rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
    rockTexture.repeat.set(1, 1);
    buildingTexture.wrapS = buildingTexture.wrapT = THREE.RepeatWrapping;
    buildingTexture.repeat.set(2, 4);
    houseWallTexture.wrapS = houseWallTexture.wrapT = THREE.RepeatWrapping;
    houseWallTexture.repeat.set(2, 2);
    roofTexture.wrapS = roofTexture.wrapT = THREE.RepeatWrapping;
    roofTexture.repeat.set(1, 1);

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        roughness: 0.9,
        metalness: 0.1,
        color: 0x2D5A27  // Verde mais escuro para o chão
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Criar pista de pouso
    function createRunway() {
        const runwayGroup = new THREE.Group();

        // Base da pista (asfalto)
        const runwayGeometry = new THREE.PlaneGeometry(20, 100);
        const runwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Cor do asfalto
            roughness: 0.7,
            metalness: 0.1
        });
        const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
        runway.rotation.x = -Math.PI / 2;
        runway.position.y = -1.99; // Ligeiramente acima do chão
        runway.receiveShadow = true;
        runwayGroup.add(runway);

        // Marcações centrais da pista
        const stripeCount = 20;
        for (let i = 0; i < stripeCount; i++) {
            const stripeGeometry = new THREE.PlaneGeometry(1, 3);
            const stripeMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF, // Branco
                roughness: 0.5
            });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(0, -1.98, -40 + i * 5); // Distribuir ao longo da pista
            stripe.receiveShadow = true;
            runwayGroup.add(stripe);
        }

        // Marcações laterais da pista
        const sideStripeGeometry = new THREE.PlaneGeometry(0.5, 100);
        const sideStripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5
        });

        // Faixa lateral esquerda
        const leftStripe = new THREE.Mesh(sideStripeGeometry, sideStripeMaterial);
        leftStripe.rotation.x = -Math.PI / 2;
        leftStripe.position.set(-9.5, -1.98, 0);
        leftStripe.receiveShadow = true;
        runwayGroup.add(leftStripe);

        // Faixa lateral direita
        const rightStripe = new THREE.Mesh(sideStripeGeometry, sideStripeMaterial);
        rightStripe.rotation.x = -Math.PI / 2;
        rightStripe.position.set(9.5, -1.98, 0);
        rightStripe.receiveShadow = true;
        runwayGroup.add(rightStripe);

        // Números da pista
        const number1Geometry = new THREE.PlaneGeometry(3, 5);
        const numberMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5
        });
        
        // Número no início da pista
        const number1 = new THREE.Mesh(number1Geometry, numberMaterial);
        number1.rotation.x = -Math.PI / 2;
        number1.position.set(-5, -1.98, -45);
        number1.receiveShadow = true;
        runwayGroup.add(number1);

        // Número no fim da pista
        const number2 = new THREE.Mesh(number1Geometry, numberMaterial);
        number2.rotation.x = -Math.PI / 2;
        number2.rotation.z = Math.PI;
        number2.position.set(5, -1.98, 45);
        number2.receiveShadow = true;
        runwayGroup.add(number2);

        return runwayGroup;
    }

    // Adicionar pista de pouso à cena
    const runway = createRunway();
    scene.add(runway);

    // Função para criar uma montanha
    function createMountain(x, z, height, radius) {
        const segments = 128;
        const mountainGroup = new THREE.Group();
        
        // Criar vários picos para formar uma montanha irregular
        const numPeaks = 5;
        for (let i = 0; i < numPeaks; i++) {
            const peakRadius = radius * (0.5 + Math.random() * 0.5);
            const peakHeight = height * (0.7 + Math.random() * 0.6);
            const offsetX = (Math.random() - 0.5) * radius * 0.5;
            const offsetZ = (Math.random() - 0.5) * radius * 0.5;
            
            // Geometria do pico com base mais larga
            const peakGeometry = new THREE.ConeGeometry(peakRadius * 1.2, peakHeight, segments / 4);
            
            // Material simplificado para a montanha
            const mountainMaterial = new THREE.MeshPhongMaterial({
                color: 0x4A4A4A, // Cinza mais escuro
                shininess: 5,
                specular: 0x222222
            });

            const peak = new THREE.Mesh(peakGeometry, mountainMaterial);
            peak.position.set(offsetX, peakHeight/2 - 2, offsetZ);
            
            // Adicionar deformações mais suaves nos vértices
            const vertices = peak.geometry.attributes.position.array;
            for (let j = 0; j < vertices.length; j += 3) {
                const heightPercent = vertices[j + 1] / peakHeight;
                const deformAmount = (1 - heightPercent) * 0.4;
                
                vertices[j] += (Math.random() - 0.5) * peakRadius * deformAmount;
                vertices[j + 1] += (Math.random() - 0.5) * peakHeight * 0.1;
                vertices[j + 2] += (Math.random() - 0.5) * peakRadius * deformAmount;
            }
            peak.geometry.attributes.position.needsUpdate = true;
            peak.geometry.computeVertexNormals();
            
            peak.castShadow = true;
            peak.receiveShadow = true;
            mountainGroup.add(peak);
        }
        
        mountainGroup.position.set(x, 0, z);
        return mountainGroup;
    }

    // Adicionar montanhas ao cenário com tamanhos variados
    const mountains = [
        createMountain(-450, -450, 120, 150), // Montanha maior no canto inferior esquerdo
        createMountain(-450, 450, 130, 160),  // Montanha maior no canto superior esquerdo
        createMountain(450, -450, 140, 170),  // Montanha maior no canto inferior direito
        createMountain(450, 450, 125, 155)    // Montanha maior no canto superior direito
    ];
    mountains.forEach(mountain => scene.add(mountain));

    // Adicionar prédios ao cenário (evitando a área da pista)
    const buildings = [];
    for (let i = 0; i < 25; i++) { // Aumentado para 25 prédios
        let x, z;
        do {
            x = (Math.random() - 0.5) * 800;
            z = (Math.random() - 0.5) * 800;
        } while (Math.abs(x) < 50 || Math.abs(z) < 80); // Área maior de exclusão ao redor da pista

        const height = 20 + Math.random() * 60; // Altura entre 20 e 80 unidades
        buildings.push(createBuilding(x, z, height));
    }
    buildings.forEach(building => scene.add(building));

    // Adicionar casas ao cenário (evitando a área da pista)
    const houses = [];
    for (let i = 0; i < 80; i++) { // Aumentado para 80 casas
        let x, z;
        do {
            x = (Math.random() - 0.5) * 800;
            z = (Math.random() - 0.5) * 800;
        } while (Math.abs(x) < 40 || Math.abs(z) < 70); // Área de exclusão ao redor da pista

        houses.push(createHouse(x, z));
    }
    houses.forEach(house => scene.add(house));

    // Após a criação das casas e antes de adicionar as ruas
    // Função para criar uma árvore
    function createTree(x, z) {
        const group = new THREE.Group();

        // Tronco
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({
            color: 0x4A2F17, // Marrom escuro
            shininess: 5
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5 - 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Copa da árvore (3 camadas de cones)
        const leafMaterial = new THREE.MeshPhongMaterial({
            color: 0x2D5A27, // Verde escuro
            shininess: 10
        });

        for (let i = 0; i < 3; i++) {
            const coneGeometry = new THREE.ConeGeometry(1.5 - i * 0.3, 2, 8);
            const cone = new THREE.Mesh(coneGeometry, leafMaterial);
            cone.position.y = 3 + i * 1.2 - 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            group.add(cone);
        }

        group.position.set(x, 0, z);
        return group;
    }

    // Função para criar uma rua
    function createStreet(startX, startZ, endX, endZ, width) {
        const group = new THREE.Group();

        // Calcular comprimento e ângulo da rua
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));
        const angle = Math.atan2(endZ - startZ, endX - startX);

        // Asfalto
        const roadGeometry = new THREE.PlaneGeometry(length, width);
        const roadMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 10
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = -angle;
        road.position.y = -1.99;
        road.receiveShadow = true;
        group.add(road);

        // Faixas laterais brancas
        const stripeGeometry = new THREE.PlaneGeometry(length, 0.3);
        const stripeMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            shininess: 5
        });

        // Faixa esquerda
        const leftStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        leftStripe.rotation.x = -Math.PI / 2;
        leftStripe.rotation.z = -angle;
        leftStripe.position.y = -1.98;
        leftStripe.position.x = (width / 2 - 0.3) * Math.cos(angle + Math.PI / 2);
        leftStripe.position.z = (width / 2 - 0.3) * Math.sin(angle + Math.PI / 2);
        group.add(leftStripe);

        // Faixa direita
        const rightStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        rightStripe.rotation.x = -Math.PI / 2;
        rightStripe.rotation.z = -angle;
        rightStripe.position.y = -1.98;
        rightStripe.position.x = -(width / 2 - 0.3) * Math.cos(angle + Math.PI / 2);
        rightStripe.position.z = -(width / 2 - 0.3) * Math.sin(angle + Math.PI / 2);
        group.add(rightStripe);

        // Faixas de pedestres a cada 30 unidades
        const crosswalkCount = Math.floor(length / 30);
        for (let i = 1; i <= crosswalkCount; i++) {
            const crosswalkGroup = new THREE.Group();
            
            // 5 faixas brancas
            for (let j = 0; j < 5; j++) {
                const stripeGeometry = new THREE.PlaneGeometry(width - 1, 0.6);
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.y = -1.97;
                stripe.position.z = j * 1.2 - 2.4;
                crosswalkGroup.add(stripe);
            }

            crosswalkGroup.rotation.y = angle;
            crosswalkGroup.position.x = startX + (endX - startX) * (i / (crosswalkCount + 1));
            crosswalkGroup.position.z = startZ + (endZ - startZ) * (i / (crosswalkCount + 1));
            group.add(crosswalkGroup);
        }

        group.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2);
        return group;
    }

    // Função para criar um poste de luz
    function createLampPost(x, z) {
        const group = new THREE.Group();

        // Poste vertical
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({
            color: 0x4A4A4A,
            shininess: 30
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 2.5 - 2;
        pole.castShadow = true;
        group.add(pole);

        // Luminária
        const lampGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const lampMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFF99,
            shininess: 100,
            emissive: 0xFFFF99,
            emissiveIntensity: 0.5
        });
        const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
        lamp.position.y = 4.5 - 2;
        lamp.castShadow = true;
        group.add(lamp);

        // Suporte horizontal
        const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const support = new THREE.Mesh(supportGeometry, poleMaterial);
        support.position.y = 4.2 - 2;
        support.rotation.z = Math.PI / 2;
        support.castShadow = true;
        group.add(support);

        // Luz pontual
        const light = new THREE.PointLight(0xFFFF99, 0.5, 15);
        light.position.y = 4.5 - 2;
        group.add(light);

        group.position.set(x, 0, z);
        return group;
    }

    // Após adicionar as casas e antes de criar o avião
    // Adicionar ruas principais
    const streets = [
        createStreet(-400, 0, 400, 0, 12), // Rua horizontal principal
        createStreet(0, -400, 0, 400, 12), // Rua vertical principal
        createStreet(-200, -200, 200, -200, 8), // Rua horizontal secundária inferior
        createStreet(-200, 200, 200, 200, 8), // Rua horizontal secundária superior
        createStreet(-200, -200, -200, 200, 8), // Rua vertical secundária esquerda
        createStreet(200, -200, 200, 200, 8) // Rua vertical secundária direita
    ];
    streets.forEach(street => scene.add(street));

    // Adicionar árvores ao longo das ruas e próximas às casas
    for (let i = 0; i < 150; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * 800;
            z = (Math.random() - 0.5) * 800;
        } while (
            Math.abs(x) < 30 || // Evitar área da pista
            Math.abs(z) < 60 || // Evitar área da pista
            streets.some(street => { // Evitar área das ruas
                const dx = x - street.position.x;
                const dz = z - street.position.z;
                return Math.sqrt(dx * dx + dz * dz) < 10;
            })
        );
        
        scene.add(createTree(x, z));
    }

    // Adicionar postes de luz ao longo das ruas
    for (let i = -400; i <= 400; i += 40) {
        // Ao longo da rua horizontal principal
        scene.add(createLampPost(i, 6));
        scene.add(createLampPost(i, -6));
        
        // Ao longo da rua vertical principal
        scene.add(createLampPost(6, i));
        scene.add(createLampPost(-6, i));
    }

    // Ao longo das ruas secundárias
    for (let i = -200; i <= 200; i += 40) {
        // Ruas horizontais secundárias
        scene.add(createLampPost(i, 206));
        scene.add(createLampPost(i, 194));
        scene.add(createLampPost(i, -206));
        scene.add(createLampPost(i, -194));
        
        // Ruas verticais secundárias
        scene.add(createLampPost(206, i));
        scene.add(createLampPost(194, i));
        scene.add(createLampPost(-206, i));
        scene.add(createLampPost(-194, i));
    }

    // Função para criar nuvens com tamanhos mais variados
    function createCloud() {
        const cloudGroup = new THREE.Group();
        const cloudGeometry = new THREE.SphereGeometry(2, 16, 16);
        const cloudMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const baseSize = 2 + Math.random() * 3; // Tamanho base variável entre 2 e 5
        const numPieces = 5 + Math.floor(Math.random() * 4); // 5 a 8 peças por nuvem

        for (let i = 0; i < numPieces; i++) {
            const cloudPiece = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloudPiece.position.x = i * 1.5;
            cloudPiece.position.y = Math.random() * 2;
            cloudPiece.position.z = Math.random() * 2;
            const scale = baseSize * (0.8 + Math.random() * 0.4);
            cloudPiece.scale.set(scale, scale * 0.6, scale);
            cloudGroup.add(cloudPiece);
        }
        return cloudGroup;
    }

    // Adicionar mais nuvens com movimento
    const clouds = [];
    for (let i = 0; i < 30; i++) { // Aumentado para 30 nuvens
        const cloud = createCloud();
        cloud.position.set(
            Math.random() * 800 - 400, // Distribuição mais ampla no eixo X
            Math.random() * 20 + 50,   // Altura entre 50 e 70 unidades
            Math.random() * 800 - 400  // Distribuição mais ampla no eixo Z
        );
        clouds.push(cloud);
        scene.add(cloud);
    }

    // Criar o avião
    const airplane = createAirplane();
    airplane.castShadow = true;
    airplane.position.set(0, 0, -40); // Ajustado para ficar no solo
    airplane.rotation.y = 0;
    scene.add(airplane);

    // Controles de teclado
    const keys = {
        w: false,
        s: false,
        a: false,
        d: false,
        q: false,
        e: false,
        r: false,
        c: false, // Alternar modo de câmera
        ' ': false // Tecla de espaço para parar
    };

    // Estado do avião
    const airplaneState = {
        speed: 0,
        rotation: 0,
        targetRotation: 0,
        rotationSpeed: 0,
        altitude: 0,        // Ajustado para começar no solo
        targetAltitude: 0,  // Ajustado para começar no solo
        verticalSpeed: 0,
        position: new THREE.Vector3(0, 0, -40), // Ajustado para começar no solo
        velocity: new THREE.Vector3(0, 0, 0),
        pitch: 0,
        targetPitch: 0,
        roll: 0,
        targetRoll: 0
    };

    // Estado da câmera
    const cameraState = {
        followPlane: true, // Começa seguindo o avião
        distance: 25,      // Aumentado para ter uma visão mais distante
        height: 8         // Aumentado para ver o avião de cima
    };

    // Configurar controles
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enabled = false; // Começa desativado pois a câmera começa seguindo o avião

    // Configurar câmera
    camera.position.set(0, 10, 20);
    camera.lookAt(airplane.position);

    // Eventos de teclado
    window.addEventListener('keydown', (event) => {
        if (keys.hasOwnProperty(event.key.toLowerCase())) {
            keys[event.key.toLowerCase()] = true;
        }
        // Alternar modo de câmera quando pressionar C
        if (event.key.toLowerCase() === 'c') {
            cameraState.followPlane = !cameraState.followPlane;
            controls.enabled = !cameraState.followPlane;
            
            if (!cameraState.followPlane) {
                // No modo livre, a câmera ainda olha para o avião
                controls.target.copy(airplane.position);
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        if (keys.hasOwnProperty(event.key.toLowerCase())) {
            keys[event.key.toLowerCase()] = false;
        }
    });

    // Função para criar o avião
    function createAirplane() {
        const group = new THREE.Group();

        switch (selectedAirplaneType) {
            case 'airbus':
                // Cores para o Airbus A320
                const airbusColors = {
                    body: 0xFFFFFF,    // Branco
                    wing: 0x2C3E50,    // Azul escuro
                    window: 0x95A5A6,  // Cinza claro
                    detail: 0x4A90E2   // Azul claro
                };

                // Corpo mais largo e longo
                for (let i = 0; i < 7; i++) {
                    const bodyGeometry = new THREE.BoxGeometry(1.5, 1.5, 1);
                    const bodyMaterial = new THREE.MeshPhongMaterial({ color: airbusColors.body });
                    const bodyPart = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    bodyPart.position.set(0, 0, i - 3);
                    bodyPart.castShadow = true;
                    group.add(bodyPart);
                }

                // Linha de janelas
                for (let i = 0; i < 5; i++) {
                    const windowGeometry = new THREE.BoxGeometry(1.6, 0.4, 0.8);
                    const windowMaterial = new THREE.MeshPhongMaterial({ color: airbusColors.window });
                    const windowPart = new THREE.Mesh(windowGeometry, windowMaterial);
                    windowPart.position.set(0, 0.2, i - 2);
                    windowPart.castShadow = true;
                    group.add(windowPart);
                }

                // Asas mais largas
                const wingGeometry = new THREE.BoxGeometry(8, 0.2, 2);
                const wingMaterial = new THREE.MeshPhongMaterial({ color: airbusColors.wing });
                const wing = new THREE.Mesh(wingGeometry, wingMaterial);
                wing.position.set(0, -0.2, 0);
                wing.castShadow = true;
                group.add(wing);
                break;

            case 'bimotor':
                // Cores para o Bimotor
                const bimotorColors = {
                    body: 0xE74C3C,    // Vermelho
                    wing: 0x2C3E50,    // Azul escuro
                    window: 0x95A5A6,  // Cinza claro
                    detail: 0x2C3E50   // Azul escuro
                };

                // Corpo menor
                for (let i = 0; i < 4; i++) {
                    const bodyGeometry = new THREE.BoxGeometry(1, 1, 1);
                    const bodyMaterial = new THREE.MeshPhongMaterial({ color: bimotorColors.body });
                    const bodyPart = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    bodyPart.position.set(0, 0, i - 1.5);
                    bodyPart.castShadow = true;
                    group.add(bodyPart);
                }

                // Dois motores nas asas
                const engineGeometry = new THREE.BoxGeometry(1, 1, 1.5);
                const engineMaterial = new THREE.MeshPhongMaterial({ color: bimotorColors.detail });
                
                const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
                leftEngine.position.set(-2, -0.2, 0);
                group.add(leftEngine);

                const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
                rightEngine.position.set(2, -0.2, 0);
                group.add(rightEngine);

                // Asas menores
                const bimotorWing = new THREE.BoxGeometry(5, 0.2, 1.5);
                const bimotorWingMesh = new THREE.Mesh(bimotorWing, new THREE.MeshPhongMaterial({ color: bimotorColors.wing }));
                bimotorWingMesh.position.set(0, 0, 0);
                group.add(bimotorWingMesh);
                break;

            case 'jet':
                // Cores para o Jato
                const jetColors = {
                    body: 0x27AE60,    // Verde
                    wing: 0x2C3E50,    // Azul escuro
                    window: 0x95A5A6,  // Cinza claro
                    detail: 0xF1C40F   // Amarelo
                };

                // Corpo aerodinâmico
                for (let i = 0; i < 6; i++) {
                    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.8, 1);
                    const bodyMaterial = new THREE.MeshPhongMaterial({ color: jetColors.body });
                    const bodyPart = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    bodyPart.position.set(0, 0, i - 2);
                    bodyPart.castShadow = true;
                    group.add(bodyPart);
                }

                // Asas triangulares
                const jetWingGeometry = new THREE.BoxGeometry(4, 0.2, 2);
                const jetWingMesh = new THREE.Mesh(jetWingGeometry, new THREE.MeshPhongMaterial({ color: jetColors.wing }));
                jetWingMesh.position.set(0, 0, 0);
                jetWingMesh.rotation.y = Math.PI * 0.15;
                group.add(jetWingMesh);

                // Cauda em V
                const vTailGeometry = new THREE.BoxGeometry(2, 1, 1);
                const vTailMesh = new THREE.Mesh(vTailGeometry, new THREE.MeshPhongMaterial({ color: jetColors.wing }));
                vTailMesh.position.set(0, 0.5, -2);
                vTailMesh.rotation.z = Math.PI * 0.25;
                group.add(vTailMesh);
                break;

            case 'glider':
                // Cores para o Planador
                const gliderColors = {
                    body: 0xFFFFFF,    // Branco
                    wing: 0x4A90E2,    // Azul claro
                    window: 0x95A5A6,  // Cinza claro
                    detail: 0x4A90E2   // Azul claro
                };

                // Corpo fino e longo
                for (let i = 0; i < 5; i++) {
                    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.6, 1);
                    const bodyMaterial = new THREE.MeshPhongMaterial({ color: gliderColors.body });
                    const bodyPart = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    bodyPart.position.set(0, 0, i - 2);
                    bodyPart.castShadow = true;
                    group.add(bodyPart);
                }

                // Asas muito longas
                const gliderWingGeometry = new THREE.BoxGeometry(10, 0.1, 1);
                const gliderWingMesh = new THREE.Mesh(gliderWingGeometry, new THREE.MeshPhongMaterial({ color: gliderColors.wing }));
                gliderWingMesh.position.set(0, 0.2, 0);
                group.add(gliderWingMesh);

                // Cauda em T
                const tTailVerticalGeometry = new THREE.BoxGeometry(0.1, 1, 1);
                const tTailVerticalMesh = new THREE.Mesh(tTailVerticalGeometry, new THREE.MeshPhongMaterial({ color: gliderColors.wing }));
                tTailVerticalMesh.position.set(0, 0.5, -2);
                group.add(tTailVerticalMesh);

                const tTailHorizontalGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
                const tTailHorizontalMesh = new THREE.Mesh(tTailHorizontalGeometry, new THREE.MeshPhongMaterial({ color: gliderColors.wing }));
                tTailHorizontalMesh.position.set(0, 1, -2);
                group.add(tTailHorizontalMesh);
                break;

            default:
                // Modelo padrão (caso algo dê errado)
                const defaultGeometry = new THREE.BoxGeometry(1, 1, 3);
                const defaultMaterial = new THREE.MeshPhongMaterial({ color: 0x4A90E2 });
                const defaultMesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
                group.add(defaultMesh);
        }

        return group;
    }

    // Função para criar um prédio
    function createBuilding(x, z, height) {
        const group = new THREE.Group();
        
        // Corpo do prédio
        const buildingGeometry = new THREE.BoxGeometry(10, height, 10);
        const buildingMaterial = new THREE.MeshPhongMaterial({
            color: 0x607D8B, // Azul acinzentado mais escuro
            shininess: 20
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = height/2 - 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        // Janelas
        const windowRows = Math.floor(height / 4);
        const windowsPerRow = 3;
        const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
        const windowMaterial = new THREE.MeshPhongMaterial({
            color: 0x1E88E5, // Azul mais escuro para as janelas
            shininess: 100,
            opacity: 0.7,
            transparent: true
        });

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowsPerRow; col++) {
                // Janelas frontais
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                windowMesh.position.set(-3 + col * 3, row * 4, 5.1);
                group.add(windowMesh);

                // Janelas traseiras
                const windowMeshBack = windowMesh.clone();
                windowMeshBack.position.z = -5.1;
                group.add(windowMeshBack);

                // Janelas laterais (menores)
                const sideWindowGeometry = new THREE.BoxGeometry(0.1, 2, 1.5);
                const sideWindow1 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
                sideWindow1.position.set(5.1, row * 4, -3 + col * 3);
                group.add(sideWindow1);

                const sideWindow2 = sideWindow1.clone();
                sideWindow2.position.x = -5.1;
                group.add(sideWindow2);
            }
        }

        // Topo do prédio
        const roofGeometry = new THREE.BoxGeometry(11, 1, 11);
        const roofMaterial = new THREE.MeshPhongMaterial({
            color: 0x37474F, // Cinza mais escuro para o telhado
            shininess: 10
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height - 1.5;
        roof.castShadow = true;
        group.add(roof);

        group.position.set(x, 0, z);
        return group;
    }

    // Função para criar uma casa
    function createHouse(x, z) {
        const group = new THREE.Group();
        
        // Dimensões da casa
        const width = 6;
        const height = 4;
        const depth = 6;
        
        // Corpo da casa
        const houseGeometry = new THREE.BoxGeometry(width, height, depth);
        const houseMaterial = new THREE.MeshPhongMaterial({
            map: houseWallTexture,
            color: 0x8B4513,
            shininess: 10
        });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.y = height/2 - 2;
        house.castShadow = true;
        house.receiveShadow = true;
        group.add(house);
        
        // Telhado
        const roofHeight = 2;
        
        // Criar os vértices do telhado
        const roofVertices = [
            // Face frontal
            -width/2 * 1.2, height - 2, depth/2 * 1.2,  // 0
            width/2 * 1.2, height - 2, depth/2 * 1.2,   // 1
            0, height + roofHeight - 2, 0,              // 2 (ponto do topo)
            
            // Face traseira
            -width/2 * 1.2, height - 2, -depth/2 * 1.2, // 3
            width/2 * 1.2, height - 2, -depth/2 * 1.2,  // 4
            
            // Base do telhado (para fechar os lados)
            -width/2 * 1.2, height - 2, depth/2 * 1.2,  // 5
            width/2 * 1.2, height - 2, depth/2 * 1.2,   // 6
            -width/2 * 1.2, height - 2, -depth/2 * 1.2, // 7
            width/2 * 1.2, height - 2, -depth/2 * 1.2   // 8
        ];
        
        // Criar as faces do telhado
        const roofIndices = [
            // Face frontal
            0, 1, 2,
            
            // Face traseira
            4, 3, 2,
            
            // Face lateral esquerda
            3, 0, 2,
            
            // Face lateral direita
            1, 4, 2,
            
            // Base do telhado (opcional, se quiser fechar)
            7, 6, 5,
            7, 8, 6
        ];
        
        const roofGeometry = new THREE.BufferGeometry();
        roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
        roofGeometry.setIndex(roofIndices);
        roofGeometry.computeVertexNormals();
        
        const roofMaterial = new THREE.MeshPhongMaterial({
            map: roofTexture,
            color: 0x3E2723,
            shininess: 5,
            side: THREE.DoubleSide
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.castShadow = true;
        roof.receiveShadow = true;
        group.add(roof);
        
        // Janelas
        const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
        const windowMaterial = new THREE.MeshPhongMaterial({
            map: windowTexture,
            color: 0x87CEEB,
            shininess: 100,
            transparent: true,
            opacity: 0.7
        });
        
        // Janelas frontais
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-1.5, height/2 - 1.5, depth/2 + 0.01);
        group.add(window1);
        
        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(1.5, height/2 - 1.5, depth/2 + 0.01);
        group.add(window2);
        
        // Janelas traseiras
        const window3 = window1.clone();
        window3.position.z = -depth/2 - 0.01;
        window3.rotation.y = Math.PI;
        group.add(window3);
        
        const window4 = window2.clone();
        window4.position.z = -depth/2 - 0.01;
        window4.rotation.y = Math.PI;
        group.add(window4);
        
        // Porta
        const doorGeometry = new THREE.PlaneGeometry(1.4, 2.2);
        const doorMaterial = new THREE.MeshPhongMaterial({
            color: 0x1B0F0A,
            shininess: 20
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -1, depth/2 + 0.01);
        group.add(door);
        
        group.position.set(x, 0, z);
        return group;
    }

    // Função para atualizar o estado do avião
    function updateAirplane() {
        const isNearGround = airplaneState.altitude <= 2;
        const MIN_AIR_SPEED = 0.2;
        const ROTATION_SPEED = 0.03;
        const ROTATION_SMOOTHING = 0.1;
        const ROLL_SMOOTHING = 0.15;
        const VERTICAL_SPEED = 1.0;      // Aumentado significativamente
        const ALTITUDE_SMOOTHING = 0.15; // Aumentado para resposta mais rápida
        const PITCH_SMOOTHING = 0.1;

        // Parar completamente quando pressionar espaço (apenas no solo)
        if (keys[' '] && isNearGround) {
            airplaneState.speed = 0;
        }

        // Acelerar/Desacelerar
        if (keys.w) {
            airplaneState.speed += 0.01;
        }
        if (keys.s) {
            if (isNearGround) {
                airplaneState.speed -= 0.01;
                airplaneState.speed = Math.max(-0.2, airplaneState.speed);
            } else {
                airplaneState.speed = Math.max(MIN_AIR_SPEED, airplaneState.speed - 0.01);
            }
        }
        
        // Limites de velocidade
        if (!isNearGround) {
            airplaneState.speed = Math.max(MIN_AIR_SPEED, Math.min(airplaneState.speed, 0.5));
        }

        // Atualizar rotação com suavização
        if (keys.a) {
            airplaneState.rotationSpeed += ROTATION_SPEED;
        } else if (keys.d) {
            airplaneState.rotationSpeed -= ROTATION_SPEED;
        } else {
            airplaneState.rotationSpeed *= 0.95; // Desacelerar a rotação gradualmente
        }

        // Limitar a velocidade máxima de rotação
        airplaneState.rotationSpeed = Math.max(-ROTATION_SPEED, Math.min(ROTATION_SPEED, airplaneState.rotationSpeed));
        
        // Aplicar a rotação suavizada
        airplaneState.rotation += airplaneState.rotationSpeed;

        // Subir/Descer com suavização
        if (keys.q) {
            airplaneState.verticalSpeed += 0.03; // Aceleração vertical muito mais rápida
        } else if (keys.e) {
            airplaneState.verticalSpeed -= 0.03;
        } else {
            airplaneState.verticalSpeed *= 0.98; // Desaceleração um pouco mais rápida
        }

        // Limitar a velocidade vertical
        airplaneState.verticalSpeed = Math.max(-VERTICAL_SPEED, Math.min(VERTICAL_SPEED, airplaneState.verticalSpeed));
        
        // Atualizar altitude com suavização (sem limite máximo)
        airplaneState.targetAltitude = Math.max(1, airplaneState.altitude + airplaneState.verticalSpeed);
        airplaneState.altitude += (airplaneState.targetAltitude - airplaneState.altitude) * ALTITUDE_SMOOTHING;

        // Atualizar inclinações (pitch e roll)
        const MAX_PITCH = Math.PI / 6;
        const MAX_ROLL = Math.PI / 4;

        // Pitch (inclinação para cima/baixo) com suavização
        if (!isNearGround) {
            // Definir o pitch alvo baseado na velocidade vertical
            airplaneState.targetPitch = -airplaneState.verticalSpeed * (MAX_PITCH / VERTICAL_SPEED);
            
            // Suavizar a transição do pitch
            airplaneState.pitch += (airplaneState.targetPitch - airplaneState.pitch) * PITCH_SMOOTHING;
        } else {
            airplaneState.targetPitch = 0;
            airplaneState.pitch *= 0.95;
        }

        // Roll (inclinação lateral) com suavização
        if (!isNearGround) {
            // Definir o roll alvo baseado na velocidade de rotação
            airplaneState.targetRoll = -airplaneState.rotationSpeed * (MAX_ROLL / ROTATION_SPEED);
            
            // Suavizar a transição do roll atual para o roll alvo
            airplaneState.roll += (airplaneState.targetRoll - airplaneState.roll) * ROLL_SMOOTHING;
        } else {
            airplaneState.targetRoll = 0;
            airplaneState.roll *= 0.95;
        }

        // Resetar posição
        if (keys.r) {
            airplane.position.set(0, 0, -40);
            airplane.rotation.set(0, 0, 0);
            airplaneState.speed = 0;
            airplaneState.rotation = 0;
            airplaneState.rotationSpeed = 0;
            airplaneState.altitude = 0;
            airplaneState.targetAltitude = 0;
            airplaneState.verticalSpeed = 0;
            airplaneState.pitch = 0;
            airplaneState.targetPitch = 0;
            airplaneState.roll = 0;
            airplaneState.targetRoll = 0;
        }

        // Atualizar rotações do avião usando quaternions para manter consistência
        const quaternion = new THREE.Quaternion();
        
        // Aplicar rotação em Y (direção)
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), airplaneState.rotation);
        
        // Criar quaternion para pitch
        const pitchQuaternion = new THREE.Quaternion();
        pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), airplaneState.pitch);
        
        // Criar quaternion para roll
        const rollQuaternion = new THREE.Quaternion();
        rollQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), airplaneState.roll);
        
        // Combinar as rotações na ordem correta
        quaternion.multiply(pitchQuaternion).multiply(rollQuaternion);
        
        // Aplicar todas as rotações ao avião
        airplane.quaternion.copy(quaternion);
        
        airplane.position.y = airplaneState.altitude;

        const direction = new THREE.Vector3(
            Math.sin(airplaneState.rotation),
            0,
            Math.cos(airplaneState.rotation)
        );
        
        direction.normalize();
        airplane.position.x += direction.x * airplaneState.speed;
        airplane.position.z += direction.z * airplaneState.speed;
    }

    // Função para atualizar a câmera
    function updateCamera() {
        if (cameraState.followPlane) {
            // Calcular a posição da câmera baseada na direção do avião
            const cameraOffset = new THREE.Vector3(0, cameraState.height, -cameraState.distance);
            
            // Aplicar a rotação do avião ao offset da câmera
            cameraOffset.applyQuaternion(airplane.quaternion);
            
            // Calcular a posição final da câmera
            const cameraPosition = airplane.position.clone().add(cameraOffset);
            
            // Atualizar posição da câmera
            camera.position.copy(cameraPosition);
            
            // Fazer a câmera olhar para o avião e um pouco à frente
            const lookAtPosition = airplane.position.clone().add(
                new THREE.Vector3(0, 0, -10).applyQuaternion(airplane.quaternion)
            );
            camera.lookAt(lookAtPosition);
        }
    }

    // Função de animação
    function animate() {
        window.animationFrameId = requestAnimationFrame(animate);

        // Atualizar controles orbitais
        controls.update();

        // Atualizar física do avião
        updateAirplane();

        // Atualizar posição da câmera
        updateCamera();

        // Atualizar posição das nuvens
        clouds.forEach((cloud, index) => {
            // Velocidade única para cada nuvem baseada em seu índice
            const speed = 0.05 + (index % 3) * 0.02;
            cloud.position.x += speed;

            // Quando a nuvem sair do mapa, reposicionar do outro lado
            if (cloud.position.x > 400) {
                cloud.position.x = -400;
                cloud.position.z = Math.random() * 800 - 400;
                cloud.position.y = Math.random() * 20 + 50;
            }
        });

        // Renderizar a cena
        renderer.render(scene, camera);
    }

    // Ajustar tamanho da janela
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Adicionar botão de retorno ao menu após criar a cena
    addReturnButton();

    // Iniciar animação
    animate();
}

// Função para criar o menu de seleção de aviões
function createAirplaneMenu() {
    // Remover qualquer div de informações de controle existente
    const oldInfoDiv = document.getElementById('controls-info');
    if (oldInfoDiv && document.body.contains(oldInfoDiv)) {
        document.body.removeChild(oldInfoDiv);
    }

    // Limpar cena anterior se existir
    if (scene) {
        while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
        }
        if (renderer && renderer.domElement && document.body.contains(renderer.domElement)) {
            document.body.removeChild(renderer.domElement);
        }
    }

    // Remover menu anterior se existir
    const oldMenu = document.getElementById('airplane-menu');
    if (oldMenu && document.body.contains(oldMenu)) {
        document.body.removeChild(oldMenu);
    }

    const menuDiv = document.createElement('div');
    menuDiv.id = 'airplane-menu';
    menuDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        font-family: 'Press Start 2P', cursive;
        z-index: 1000;
        max-width: 80%;
        max-height: 90vh;
        overflow-y: auto;
    `;

    const title = document.createElement('h1');
    title.textContent = 'Selecione seu Avião';
    title.style.marginBottom = '20px';
    title.style.color = '#4A90E2';
    menuDiv.appendChild(title);

    // Adicionar seção de controles
    const controlsTitle = document.createElement('h2');
    controlsTitle.textContent = 'Controles:';
    controlsTitle.style.color = '#4A90E2';
    controlsTitle.style.marginTop = '20px';
    controlsTitle.style.fontSize = '16px';
    menuDiv.appendChild(controlsTitle);

    const controls = [
        'W/S - Acelerar/Desacelerar',
        'A/D - Girar Esquerda/Direita',
        'Q/E - Subir/Descer',
        'R - Resetar Posição',
        'C - Alternar Câmera',
        'Espaço - Parar (quando no solo)'
    ];

    const controlsList = document.createElement('div');
    controlsList.style.cssText = `
        text-align: left;
        margin: 20px auto;
        font-size: 12px;
        line-height: 2;
        color: #FFFFFF;
    `;

    controls.forEach(control => {
        const controlItem = document.createElement('div');
        controlItem.textContent = control;
        controlsList.appendChild(controlItem);
    });
    menuDiv.appendChild(controlsList);

    const airplaneTypes = [
        { name: 'Airbus A320', type: 'airbus' },
        { name: 'Bimotor Pixel', type: 'bimotor' },
        { name: 'Jato Executivo', type: 'jet' },
        { name: 'Planador', type: 'glider' }
    ];

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.marginTop = '20px';
    menuDiv.appendChild(buttonsContainer);

    airplaneTypes.forEach(airplane => {
        const button = document.createElement('button');
        button.className = 'airplane-button';
        button.style.cssText = `
            display: block;
            width: 200px;
            margin: 10px auto;
            padding: 10px;
            background: #2C3E50;
            border: 2px solid #4A90E2;
            color: white;
            cursor: pointer;
            font-family: 'Press Start 2P', cursive;
            font-size: 12px;
            transition: all 0.3s;
        `;
        button.textContent = airplane.name;
        
        button.onmouseover = () => {
            button.style.background = '#4A90E2';
        };
        button.onmouseout = () => {
            button.style.background = '#2C3E50';
        };
        
        button.onclick = () => {
            selectedAirplaneType = airplane.type;
            menuDiv.style.display = 'none';
            document.body.removeChild(menuDiv);
            init();
        };
        
        buttonsContainer.appendChild(button);
    });

    document.body.appendChild(menuDiv);
    return menuDiv;
}

// Adicionar botão de retorno ao menu
function addReturnButton() {
    const returnButton = document.createElement('button');
    returnButton.id = 'return-button';
    returnButton.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 10px;
        background: #2C3E50;
        border: 2px solid #4A90E2;
        color: white;
        cursor: pointer;
        font-family: 'Press Start 2P', cursive;
        font-size: 12px;
        transition: all 0.3s;
        z-index: 1000;
    `;
    returnButton.textContent = 'Voltar ao Menu';
    
    returnButton.onmouseover = () => {
        returnButton.style.background = '#4A90E2';
    };
    returnButton.onmouseout = () => {
        returnButton.style.background = '#2C3E50';
    };
    
    returnButton.onclick = () => {
        // Parar a animação atual
        if (window.animationFrameId) {
            cancelAnimationFrame(window.animationFrameId);
        }
        
        // Limpar a cena atual
        if (scene) {
            while(scene.children.length > 0){ 
                scene.remove(scene.children[0]); 
            }
        }
        
        // Remover elementos do DOM
        if (renderer && renderer.domElement && document.body.contains(renderer.domElement)) {
            document.body.removeChild(renderer.domElement);
        }
        
        if (returnButton && document.body.contains(returnButton)) {
            document.body.removeChild(returnButton);
        }
        
        // Recriar o menu
        createAirplaneMenu();
    };
    
    document.body.appendChild(returnButton);
}

// Modificar o início do jogo para mostrar o menu primeiro
window.onload = () => {
    // Adicionar fonte pixel art
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);

    // Remover qualquer elemento anterior
    const oldCanvas = document.querySelector('canvas');
    if (oldCanvas && document.body.contains(oldCanvas)) {
        document.body.removeChild(oldCanvas);
    }
    
    const oldButton = document.getElementById('return-button');
    if (oldButton && document.body.contains(oldButton)) {
        document.body.removeChild(oldButton);
    }

    // Criar o menu
    createAirplaneMenu();
};

// Iniciar o jogo quando o Three.js estiver carregado
checkThreeJS()
    .then(() => {
        console.log('Three.js carregado com sucesso!');
        // Criar o menu inicial em vez de iniciar o jogo diretamente
        createAirplaneMenu();
    })
    .catch(error => {
        console.error('Erro ao carregar Three.js:', error);
    }); 