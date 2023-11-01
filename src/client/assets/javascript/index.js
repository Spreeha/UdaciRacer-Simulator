// Global Info
let store = {
  track_id: undefined,
  player_id: undefined,
  race_id: undefined,
};

// DOM loading wait time
document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  try {
    getTracks().then((tracks) => {
      const html = renderTrackCards(tracks);
      renderAt("#tracks", html);
    });

    getRacers().then((racers) => {
      const html = renderRacerCars(racers);
      renderAt("#racers", html);
    });
  } catch (err) {
    console.log("Issue in fetching tracks and racers ::", err.message);
    console.error(err);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      let { target } = event;

      if (
        target.matches(".card.track") ||
        target.parentNode.matches(".card.track")
      ) {
        if (target.parentNode.matches(".card.track")) {
          target = target.parentNode;
        }
        handleSelectTrack(target);
      }

      // Podracer form field
      if (
        target.matches(".card.podracer") ||
        target.parentNode.matches(".card.podracer")
      ) {
        if (target.parentNode.matches(".card.podracer")) {
          target = target.parentNode;
        }
        handleSelectPodRacer(target);
      }

      if (target.matches("#submit-create-race")) {
        event.preventDefault();
        handleCreateRace();
      }

      if (target.matches("#gas-peddle")) {
        handleAccelerate(target);
      }
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (err) {
    console.log("An error will not be possible here");
    console.log(err);
  }
}

// This async function controls the flow of the race, the logic and error handling
async function handleCreateRace() {
  const playerid = store.player_id;
  const trackid = store.track_id;

  if (!playerid || !trackid) {
    alert("Please select racer and track to start the race!");
    return;
  }

  try {
    const race = await createRace(playerid, trackid);

    store.race_id = race.ID - 1;
    renderAt("#race", renderRaceStartView(trackid));
    await runCountdown();
    await startRace(store.race_id);
    await runRace(store.race_id);
  } catch (err) {
    console.log("Problem with handleCreateRace: ", err.message);
  }
}

async function runRace(raceID) {
  const _delayTime = 1000;
  await delay(_delayTime);

  return new Promise((resolve) => {
    const interval_ID = setInterval(async () => {
      const res = await getRace(raceID);

      if (res.status !== "finished") {
        renderAt("#leaderBoard", raceProgress(res.positions));
      } else {
        clearInterval(interval_ID);
        resolve(res);
      }
    }, 500);
  }).catch((e) => console.log(e));
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;
    return new Promise((resolve) => {
      const timerInt = setInterval(() => {
        document.getElementById("big-numbers").innerHTML = --timer;
        if (timer === 0) {
          clearInterval(timerInt);
          resolve();
          return;
        }
      }, 1000);
    });
  } catch (err) {
    console.log(err);
  }
}

function handleSelectPodRacer(target) {
  console.log("Selection of a pod", target.id);

  // remove class selected from all racer options
  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }
  // add class selected to current target
  target.classList.add("selected");

  // save the selected racer to the store
  store.player_id = parseInt(target.id);
}

function handleSelectTrack(tar) {
  console.log("selected a track", tar.id);

  // remove class selected from all track options
  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }
  // add class selected to current target
  tar.classList.add("selected");
  // save the selected track id to the store
  store.track_id = tar.id;
}
// HTML CONTROLS------------------------------------------------
function handleAccelerate(tar) {
  console.log("accelerate button clicked");
  accelerate(store.race_id);
}

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;

  return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>${top_speed}</p>
			<p>${acceleration}</p>
			<p>${handling}</p>
		</li>
	`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }
  const results = tracks.map(renderTrackCard).join("");

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;
  return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`;
}



function renderRaceStartView(track, racers) {
  return `
		<header>
			<h1>Race: ${store.track_id}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>
			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button fast to make the racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));
  return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
  const userPlayer = positions.find((e) => e.id == store.player_id);
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;
  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);
  node.innerHTML = html;
}

// API CALLS ------------------------------------------------

const SERVER = "http://localhost:8000";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

function getTracks() {
  // GET request to `${SERVER}/api/tracks`
  return fetch(`${SERVER}/api/tracks`)
    .then((res) => res.json())
    .catch((err) =>
      console.log(
        `ERROR in getTracks`,
        err
      )
    );
}

function getRacers() {
  // GET request to `${SERVER}/api/cars`
  return fetch(`${SERVER}/api/cars`)
    .then((res) => res.json())
    .catch((err) =>
      console.log(
        `ERROR in getRacers`,
        err
      )
    );
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) =>
      console.log(
        "ERROR in createRace",
        err
      )
    );
}

function getRace(id) {
  // GET request to `${SERVER}/api/races/${id}`
  return fetch(`${SERVER}/api/races/${id}`)
    .then((res) => res.json())
    .catch((err) =>
      console.log(
        `ERRORin getRace id `,
        err
      )
    );
}

function startRace(id) {
  return fetch(`${SERVER}/api/races/${id}/start`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((err) =>
    console.log(
      "ERROR in startRace",
      err
    )
  );
}

function accelerate(id) {
  // POST request to `${SERVER}/api/races/${id}/accelerate`
  // options parameter provided as defaultFetchOpts
  // no body or datatype needed for this request
  return fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
    body: "",
  }).catch((err) =>
    console.log(
      "ERROR in accelerate",
      err
    )
  );
}
