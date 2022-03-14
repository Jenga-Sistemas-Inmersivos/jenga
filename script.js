function createBox(scene, pos, yRotation, cubeNumber) {
    const box = document.createElement("a-box");
    box.setAttribute("id", "piece" + cubeNumber);
    box.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
    box.setAttribute("width", "0.135");
    box.setAttribute("height", "0.1");
    box.setAttribute("depth", "0.4");
    box.setAttribute("rotation", "0 " + yRotation + " 0");
    box.setAttribute("ammo-body", "type: dynamic; activationState: disableDeactivation; gravity: 0 -3 0; mass: 0.6");
    box.setAttribute("ammo-shape", "type: box");
    box.setAttribute("src", "#piece");
    box.setAttribute("cursor-listener", "");

    scene.appendChild(box);

    return box;
}

// createTower: create a tower based on the position of the reticle
function createTower(pos, posOG, cubes, scene) {
    let cubeNumber = 0;
    for (let i = 1; i < 14; i++) {
        const yRotation = i % 2 === 0 ? 90 : 0;
        for (let n = -0.135; n <= 0.135; n += 0.135) {
            pos.x = i % 2 === 0 ? 0 : n;
            pos.z = i % 2 === 0 ? n : 0;

            pos.x = posOG.x + pos.x;
            pos.z = posOG.z + pos.z;

            cubes.push(createBox(scene, pos, yRotation, cubeNumber++));
        }
        pos.y = pos.y + 0.1;
    }
}

AFRAME.registerSystem("cursor-listener", {
    init: function() {
        var startTime;
        var endTime;
        this.el.addEventListener("mousedown", function(e) {
            if (e.target.object3D) {
                if ("el" in e.target.object3D) {
                    startTime = performance.now();
                    let piece = e.target;
                    //console.log(e.target.object3D.el);
                    piece.setAttribute("color", "red");
                }
            }
        });
        this.el.addEventListener("mouseup", function(e) {
            if (e.target.object3D) {
                if ("el" in e.target.object3D) {
                    if (e.target.object3D.el.id.includes("piece")) {
                        endTime = performance.now();
                        let totalTime = endTime - startTime;
                        //console.log(`Call between pressing took ${endTime - startTime} milliseconds`);
                        let piece = document.getElementById(e.target.object3D.el.id);
                        console.log(piece);
                        piece.removeAttribute("color");
                        //piece.removeAttribute("ammo-body");
                        //piece.removeAttribute("ammo-shape");
                        //let scene = document.getElementById("scene");
                        piece.removeAttribute("ammo-body");
                        piece.removeAttribute("ammo-shape");
                        //piece.setAttribute("ammo-body", "type: kinematic;");
                        piece.setAttribute("visible", "false");
                        //scene.removeChild(piece);
                        //Ammo.destroy(piece);
                    }
                }
            }
        });
    }
});

AFRAME.registerSystem("jenga", {
    schema: {
        reticle: { type: "selector" },
        target: { type: "selector" }
    },
    init: function() {
        let cubes = [];

        this.isPlaneInPlace = false;
        this.reticle = this.data.reticle;
        this.target = this.data.target;
        this.target.setAttribute("visible", "false");
        let scene = this.el.sceneEl;
        scene.addEventListener("enter-vr", () => {
            // Variables
            let isTowerCreated = false;
            let pos;
            let posOG; // Create a copy to know where the original location was

            const session = scene.renderer.xr.getSession();
            scene.renderer.xr.addEventListener(
                "sessionstart",
                async(ev) => {
                    this.viewerSpace = await session.requestReferenceSpace("viewer");
                    this.refSpace = scene.renderer.xr.getReferenceSpace();
                    this.xrHitTestSource = await session.requestHitTestSource({
                        space: this.viewerSpace
                    });
                }
            );
            session.addEventListener("select", () => {
                pos = this.reticle.getAttribute("position");
                if (this.reticle.getAttribute("visible") && !this.isPlaneInPlace) {
                    posOG = pos.clone(); // Create a copy to know where the original location was
                    this.isPlaneInPlace = true;
                    //this.target.setAttribute("visible", "true");
                    this.target.setAttribute("position", posOG);
                }

                if (this.isPlaneInPlace) {
                    if (!isTowerCreated) {
                        pos = posOG.clone();
                        createTower(pos, posOG, cubes, scene);
                        isTowerCreated = true;
                    }
                }
            });

            // Reset button
            const button = document.querySelector("#btn-reset");
            // Make button visible
            document.getElementById("btn-reset").classList.remove('invisible');
            // If button is pressed
            button.addEventListener("click", function() {
                // Delete all pieces
                cubes.forEach(cube => {
                    cube.removeAttribute("ammo-body");
                    cube.removeAttribute("ammo-shape");
                    scene.removeChild(cube);
                });
                cubes = [];
                pos.y = posOG.y;
                createTower(pos, posOG, cubes, scene);
            });
        });
    },

    tick: function(t) {
        this.reticle.setAttribute("visible", "false");
        const frame = this.el.sceneEl.frame;
        if (!frame) return;

        const viewerPose = this.el.sceneEl.renderer.xr.getCameraPose();
        if (!this.isPlaneInPlace && this.xrHitTestSource && viewerPose) {
            const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
            if (hitTestResults.length > 0) {
                const hitTestPose = hitTestResults[0].getPose(this.refSpace);
                ["x", "y", "z"].forEach((axis) => {
                    this.reticle.object3D.position[axis] =
                        hitTestPose.transform.position[axis];
                });
                this.reticle.object3D.quaternion.copy(
                    hitTestPose.transform.orientation
                );
                this.reticle.setAttribute("visible", "true");
            }
        }
    }
});