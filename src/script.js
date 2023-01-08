import "./style.css";
import * as THREE from "three";
import { Group, Light } from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(ScrollToPlugin);

/*
 * INITIALIZATION
 */

// Variables
var scale = 40;
var container, stats, controls;
var camera, scene, renderer;
var constellationData = new Object();
var lineCount = 0;
var STAR_SIZE = 20;
var mouse = new THREE.Vector2();

var objectGroup = new THREE.Object3D();
var universe, connector;
var particles = [];

// Sizes
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

// Scene
scene = new THREE.Scene();

// Container
container = document.createElement("div");
document.body.appendChild(container);

// Canvas
const canvas = document.querySelector("canvas.webgl");

/*
 * CAMERA
 */

// Base camera
camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 1, 100000000000);
camera.position.set(-0.5, 0, 0);
camera.rotation.set(0.6246883485667359, 0.7680763125762045, -2.7002597811776683);

scene.add(camera);

/*
 * LIGHT
 */

// Base light
const pointLight = new THREE.PointLight(0xffffff, 1.5);
pointLight.position.set(0, 0, 0.3);
scene.add(pointLight);

var ambient = new THREE.AmbientLight("#292725");
scene.add(ambient);

/*
 * RENDERER
 */

renderer = new THREE.WebGLRenderer({
	canvas: canvas,
});
renderer.setClearColor(0x000); // Set black background
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

/*
 * DRAW
 * STARS
 * CODE
 */

// Read stars.json
fetch("https://princellea.github.io/stars.json")
	.then((response) => response.json())
	.then((data) => loadStars(data))
	.catch((error) => console.log(error));

function loadStars(data) {
	// Parse JSON data
	var result = JSON.stringify(data);
	var stars = JSON.parse(result);

	var colors = [];
	var colorsh = [];
	var lumsh = [];
	var points = [];

	// Set position and color of each star
	stars.forEach(function (star, i) {
		var pX = star.pos[0] * scale,
			pY = star.pos[1] * scale,
			pZ = star.pos[2] * scale;
		var vertex = new THREE.Vector3(pX, pY, pZ);
		points.push(vertex);

		colors[i] = new THREE.Color();
		var intc = star.color;
		colors[i].setRGB(intc[0] / 255, intc[1] / 255, intc[2] / 255);
		colorsh[i] = [intc[0] / 255, intc[1] / 255, intc[2] / 255];
		lumsh[i] = Math.pow(star.luminosity, 0.25);
	});

	// Create geometry based on star points
	let geometry = new THREE.BufferGeometry().setFromPoints(points);

	// Apply color
	geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors)));

	// Apply texture
	const loader = new THREE.TextureLoader().load(".../images/star.png");

	// Set material
	var starMaterial = new THREE.PointsMaterial({
		color: 0xffffff,
		size: STAR_SIZE,
		map: loader,
		blending: THREE.AdditiveBlending,
		transparent: true,
	});

	particles = new THREE.Points(geometry, starMaterial);
	objectGroup.add(particles);
}

/*
 * DRAW
 * CONSTELLATION
 * CODE
 */

// Read constellations.json
fetch("https://princellea.github.io/constellations.json")
	.then((response) => response.json())
	.then((data) => loadConstellations(data, camera))
	.catch((error) => console.log(error));

// Connector material
var mat = new THREE.LineBasicMaterial({
	color: "cyan",
});

function loadConstellations(data, camera) {
	// Parse JSON data
	var result = JSON.stringify(data);
	constellationData = JSON.parse(result);

	// Set position, and name of constellations based on star data
	for (var k = 0; k < constellationData.length; k++) {
		var con = constellationData[k];

		var stars = con.stars;

		var ppX = stars[0][0].x * scale,
			ppY = stars[0][0].y * scale,
			ppZ = stars[0][0].z * scale;

		var pos = new THREE.Vector3(ppX, ppY, ppZ);

		var name = con.abbr;
		if (con.hasOwnProperty("name")) {
			name = con.name;
		}

		// Add label
		Markers.addMarker(pos, name, camera);

		for (var i = 0; i < stars.length; i++) {
			var star = stars[i];
			var points = [];

			for (var j = 0; j < star.length; j++) {
				var s = star[j];
				var v = new THREE.Vector3(s.x * scale, s.y * scale, s.z * scale);
				points.push(v);
			}

			let geometry = new THREE.BufferGeometry().setFromPoints(points);
			connector = new THREE.Line(geometry, mat);
			connector.name = "Connector" + lineCount;
			objectGroup.add(connector);
			lineCount++;
		}
	}
}

/*
 * DRAW
 * MARKERS
 */

// Create marker object
var Markers = {
	markers: [],
	addMarker: function (vector, name, camera) {
		var l = {};

		var text = document.createElement("div");
		text.className = "marker";
		var t = document.createTextNode(name);
		var p = document.createElement("p");
		p.appendChild(t);
		text.appendChild(p);

		l.text = text;
		l.v = vector;

		this.markers.push(l);

		document.querySelector(".container").appendChild(l.text);

		return l.text;
	},
};

var toXYCoords = function (pos, camera) {
	var vector = pos.clone();
	vector.project(camera);

	// Map to 2D screen space
	vector.x = Math.round(((vector.x + 1) * window.innerWidth) / 2);
	vector.y = Math.round(((-vector.y + 1) * window.innerHeight) / 2);
	return vector;
};

// Update marker positions
var updateMarkers = function (markers, camera) {
	for (var i = 0; i < markers.length; i++) {
		var item = markers[i];
		var newPos = toXYCoords(item.v, camera);
		item.text.style.top = newPos.y + "px";
		item.text.style.left = newPos.x + "px";
		if (newPos.z > 1.0) {
			item.text.style.display = "none";
		} else {
			item.text.style.display = "inline-block";
		}
	}
};

/*
 * DRAW
 * UNIVERSE
 * SPHERE
 */

// Create sphere geometry
var sphereGeom = new THREE.SphereGeometry(9000000, 32, 16);

// Apply texture
var texture = new THREE.TextureLoader().load(".../images/milkyway.jpg");

texture.magFilter = THREE.LinearFilter;
texture.minFilter = THREE.NearestFilter;
var material = new THREE.MeshBasicMaterial({
	map: texture,
	transparent: false,
	side: THREE.BackSide,
});

// Add to scene
universe = new THREE.Mesh(sphereGeom.clone(), material);
universe.position.set(0, 0, 0);
objectGroup.add(universe);

/*
 * EVENTS
 */

// Resize event
window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
});

// Mousemove event
window.addEventListener("mousemove", (event) => {
	event.preventDefault();

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

/*
 * ANIMATE
 */

const clock = new THREE.Clock();

const tick = () => {
	const elapsedTime = clock.getElapsedTime();

	// Update objects
	camera.rotation.z = 0.05 * elapsedTime;

	// Render labels
	updateMarkers(Markers.markers, camera);

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
scene.add(objectGroup);

/*
 * HOROSCOPE
 * FUNCTIONALITY
 */

// API initialization
const options = {
	method: "POST",
	headers: {
		"X-RapidAPI-Key": "ee704eddb6msh318aa81ff29bed3p16dca8jsnc85c27e0d6d0",
		"X-RapidAPI-Host": "sameer-kumar-aztro-v1.p.rapidapi.com",
	},
};

const zodiacSigns = [
	"aries",
	"taurus",
	"gemini",
	"cancer",
	"leo",
	"virgo",
	"libra",
	"scorpio",
	"sagittarius",
	"capricorn",
	"aquarius",
	"pisces",
];

const api = "https://sameer-kumar-aztro-v1.p.rapidapi.com/?sign=";

/*
 * TODAY'S
 * HOROSCOPE
 * DATA
 */

function todayHoroscope() {
	var day = "&day=today";

	// Load horoscope data for each zodiac
	zodiacSigns.forEach(function (sign) {
		loadHoroscope(api, sign, day);
	});
}

todayHoroscope();

/*
 * FETCH
 * HOROSCOPE
 * DATA
 */

function loadHoroscope(api, sign, day) {
	// Concatenate API call
	var url = api + sign + day;

	// Fetch API data
	fetch(url, options)
		.then((response) => response.json())
		.then((data) => {
			const zodiac = `
        <h1>${sign.toUpperCase()}</h1>
		<h2>${data.date_range}</h2> 
		<p>${data.description}</p> 
		<ul>
			<li><b>Compatibility:</b> ${data.compatibility}</li>
			<li><b>Mood:</b> ${data.mood}</li>
			<li><b>Color:</b> ${data.color}</li>
			<li><b>Lucky Number:</b> ${data.lucky_number}</li>
			<li><b>Lucky Time:</b> ${data.lucky_time}</li>
		</ul>`;

			document.querySelector(`#${sign}`).innerHTML += zodiac;
		})
		.catch((err) => console.error(err));
}

/*
 * SCROLL
 * INDICATOR
 */

const sections = gsap.utils.toArray(".zodiac-section");
const numSections = sections.length;
const snapVal = 1 / numSections;
const navList = document.querySelectorAll(".indicator-nav li");

// Remove active class from all list items
function resetNav() {
	for (var i = 0; i < navList.length; i++) {
		navList[i].classList.remove("active");
	}
}

// Create GSAP timeline
let t2 = gsap.timeline({
	scrollTrigger: {
		trigger: ".zodiac-content",
		start: "top top",
		scrub: 1,
		onUpdate: function (self) {
			const newIndex = Math.round(self.progress / snapVal);

			resetNav();
			navList[newIndex].classList.add("active");
		},
	},
});

// Change camera rotation to face each zodiac constellation
t2.to(camera.rotation, {
	// Taurus
	x: 0.2646973601345418,
	y: 1.3503583496660425,
	z: -2.2820396403826795,
})
	.to(camera.rotation, {
		// Gemini
		x: -2.379347439984521,
		y: 1.248157748650426,
		z: -0.4445972885108448,
	})
	.to(camera.rotation, {
		// Cancer
		x: -2.536937365926273,
		y: 0.8150542856828509,
		z: -0.15064891910358827,
	})
	.to(camera.rotation, {
		// Leo
		x: -2.647632791885636,
		y: 0.4185790671769536,
		z: 0.016313303703272296,
	})
	.to(camera.rotation, {
		// Virgo
		x: -2.725469651065501,
		y: -0.4171326740310278,
		z: 0.48498436346179713,
	})
	.to(camera.rotation, {
		// Libra
		x: -2.7778626045686763,
		y: -0.9975277894510113,
		z: -0.09306499145028138,
	})
	.to(camera.rotation, {
		// Scorpio
		x: -2.3173280943661183,
		y: -1.343752483994535,
		z: 0.4178216558874426,
	})
	.to(camera.rotation, {
		// Sagittarius
		x: 0.1928567109565242,
		y: -1.353259605494904,
		z: 2.950169165852059,
	})
	.to(camera.rotation, {
		// Capricorn
		x: 0.5527504310154994,
		y: -0.42439497338129567,
		z: -1.9398356802158965,
	})
	.to(camera.rotation, {
		// Aquarius
		x: 0.5527504310154994,
		y: -0.42439497338129567,
		z: -2.2398356802158965,
	})
	.to(camera.rotation, {
		// Pisces
		x: 0.5537394454387581,
		y: 3.99147474297553116,
		z: -3.924938962938633,
	});

// Add clickable functionality to indicators
navList.forEach((anchor, i) => {
	anchor.addEventListener("click", function (e) {
		const scrollToHere = "#" + e.currentTarget.getAttribute("data-label");

		gsap.to(window, { duration: 3, scrollTo: scrollToHere });
	});
});
