import * as THREE from "three";

let keys = {
  KeyW: 0,
  KeyS: 0,
  KeyD: 0,
  KeyA: 0,
};

const socket = io();
const direction = new THREE.Vector3();
let playersCurrState = {};

class CreateScene {
  constructor() {
    this.newScene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.ambLight = new THREE.AmbientLight(0x101010, 2);
    this.init();
  }
  init() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.light.position.set(20, 100, 20);
    this.light.target.position.set(0, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.bias = -0.001;
    this.light.shadow.mapSize.width = 4096;
    this.light.shadow.mapSize.height = 4096;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 100.0;
    this.light.shadow.camera.left = 100;
    this.light.shadow.camera.right = -100;
    this.light.shadow.camera.top = 50;
    this.light.shadow.camera.bottom = -50;
    this.newScene.add(this.light);
    this.newScene.add(this.ambLight);
  }
  addToScene(object) {
    this.newScene.add(object);
  }
}
class TPcamera {
  constructor() {
    this.innerGroup = new THREE.Group();
    this.outerGroup = new THREE.Group();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.mouseSensitivity = 0.002;
    this.init();
  }
  init() {
    this.camera.rotation.set(0, THREE.MathUtils.degToRad(-180), 0);
    this.camera.rotateX(THREE.MathUtils.degToRad(-10));
    this.camera.position.set(0, 5, -10);
    this.innerGroup.add(this.camera);
    this.outerGroup.add(this.innerGroup);
  }
}
class AddPlayer {
  constructor(spawnPoint, newColor) {
    this.spawnPoint = spawnPoint;
    this.moveSpeed = 0.5;
    this.rotationSpeed = 0.05;
    this.rotationAngle = 0;
    this.direction = new THREE.Vector3();
    this.translation = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();
    this.geometry = new THREE.BoxGeometry(2, 1, 3);
    this.material = new THREE.MeshStandardMaterial({
      color: Number(newColor),
    });
    this.player = new THREE.Mesh(this.geometry, this.material);
    this.init();
  }
  init() {
    this.player.castShadow = true;
    this.player.receiveShadow = true;
    this.player.position.set(...this.spawnPoint);
  }
  inputHandling(newDir) {
    if (this.player) {
      this.direction = newDir;
      this.rotationAngle = Math.atan2(this.direction.x, this.direction.z);
      this.targetQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.rotationAngle
      );
      this.player.quaternion.slerp(this.targetQuaternion, this.rotationSpeed);
      this.translation = this.direction.clone().multiplyScalar(this.moveSpeed);
      let newPos = this.player.position.clone().add(this.translation);
      this.player.position.lerpVectors(
        this.player.position,
        newPos,
        this.moveSpeed
      );
    }
  }
}

const newEnv = new CreateScene();
const TPcam = new TPcamera();
const newPlayer = new AddPlayer(new THREE.Vector3(0, 0.5, 0), "0x0373fc");

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100, 10, 10),
  new THREE.MeshStandardMaterial({ color: 0xf3491ff })
);

plane.castShadow = false;
plane.receiveShadow = true;
plane.rotation.x = -Math.PI / 2;
newEnv.addToScene(plane);

function handleAllInput() {
  let OnWindowResize = () => {
    TPcam.camera.aspect = window.innerWidth / window.innerHeight;
    TPcam.camera.updateProjectionMatrix();
    newEnv.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  let onMouseMove = (event) => {
    if (document.pointerLockElement === newEnv.renderer.domElement) {
      var movementX =
        event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      var movementY =
        event.movementY || event.mozMovementY || event.webkitMovementY || 0;
      TPcam.innerGroup.rotation.x -= movementY * TPcam.mouseSensitivity;
      TPcam.outerGroup.rotation.y -= movementX * TPcam.mouseSensitivity;
    }
  };

  window.addEventListener("resize", OnWindowResize, false);

  document.body.addEventListener(
    "mousedown",
    () => {
      newEnv.renderer.domElement.requestPointerLock();
      document.body.style.cursor = "none";
    },
    false
  );
  window.addEventListener("mousemove", onMouseMove);

  window.addEventListener(
    "keydown",
    (event) => {
      keys[event.code] = 1;
    },
    false
  );
  window.addEventListener(
    "keyup",
    (event) => {
      keys[event.code] = 0;
    },
    false
  );
}
handleAllInput();

//Network codes-----------------------------------//
socket.on("connect", () => {
  console.log("my id: ", socket.id);
  newEnv.addToScene(TPcam.outerGroup);
  newEnv.addToScene(newPlayer.player);
  playersCurrState[socket.id] = newPlayer;
});

socket.on("newPlayerJoined", (data) => {
  for (const clientID in data) {
    const { currDir, currPos } = data[clientID];
    if (clientID != Object.keys(playersCurrState)) {
      let newCLientInst = new AddPlayer(
        new THREE.Vector3(currPos.x, currPos.y, currPos.z),
        "0xfc035e"
      );
      newCLientInst;
      newEnv.addToScene(newCLientInst.player);
      newCLientInst.inputHandling(
        new THREE.Vector3(currDir.z, currDir.y, currDir.z)
      );
      playersCurrState[clientID] = newCLientInst;
    }
  }
  console.log(playersCurrState);
});

socket.on("playerMoved", (data) => {
  if (data.id !== socket.id) {
    console.log(data.id, socket.id);

    playersCurrState[data.id].inputHandling(
      new THREE.Vector3(data.currDir.z, data.currDir.y, data.currDir.z)
    );
  }
});
socket.on("playerDisconnected", (data) => {
  console.log(data);
});
setInterval(() => {
  socket.emit("updatePlayerState", {
    direction: direction,
    position: newPlayer.player.position,
  });
}, 50);

function update() {
  let Zstrength = keys["KeyW"] - keys["KeyS"];
  let Xstrength = keys["KeyA"] - keys["KeyD"];
  direction.set(Xstrength, 0, Zstrength);
  if (newPlayer) {
    newPlayer.inputHandling(direction);
    TPcam.outerGroup.position.copy(newPlayer.player.position);
  }
  requestAnimationFrame(update);
  newEnv.renderer.render(newEnv.newScene, TPcam.camera);
}
update();
