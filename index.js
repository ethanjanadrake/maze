const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

const numberOfRows = 10;
const numberOfColumns = 20;
const wallThickness = 1;
const width = window.innerWidth;
const height = window.innerHeight;
const unitWidth = width / numberOfColumns;
const unitHeight = height / numberOfRows;

const randomCell = () => {
	const startRow = Math.floor(Math.random() * numberOfRows);
	const startColumn = Math.floor(Math.random() * numberOfColumns);
	return [
		startRow,
		startColumn
	];
};

const engine = Engine.create();
engine.world.gravity.y = 0;
const { world } = engine;
const render = Render.create({
	element : document.body,
	engine  : engine,
	options : {
		wireframes : false,
		width      : width,
		height     : height
	}
});
Render.run(render);
Runner.run(Runner.create(), engine);

// Walls
const walls = [
	Bodies.rectangle(width / 2, wallThickness, width, wallThickness, { isStatic: true }),
	Bodies.rectangle(width / 2, height - wallThickness, width, wallThickness, { isStatic: true }),
	Bodies.rectangle(wallThickness, height / 2, wallThickness, height, { isStatic: true }),
	Bodies.rectangle(width - wallThickness, height / 2, wallThickness, height, {
		isStatic : true
	})
];
World.add(world, walls);

// Maze Generation

const shuffle = (arr) => {
	let counter = arr.length;

	while (counter > 0) {
		const index = Math.floor(Math.random() * counter);

		counter--;

		const temp = arr[counter];
		arr[counter] = arr[index];
		arr[index] = temp;
	}

	return arr;
};

// the following is shorthand. Array(3) would create an empty array with three 'slots'. those have to be filled with values, even 'null'.
// the map statement is necessary because if you just made another array like grid = Array(3).fill(Array(3).fill(false)) then the three arrays within the first would be the same array referenced three times.
// the map statement will take all the nulls and replace them with new values. here we are taking each index in the parent array and filling it with a new array that has three values of false.
const grid = Array(numberOfRows).fill(null).map(() => Array(numberOfColumns).fill(false));

const horizontals = Array(numberOfRows - 1).fill(null).map(() => Array(numberOfColumns).fill(false));

const verticals = Array(numberOfRows).fill(null).map(() => Array(numberOfColumns - 1).fill(false));

const stepThroughCell = (row, column) => {
	// If I have visited the cell at [row][column], then return
	if (grid[row][column]) {
		return;
	}
	// Mark this cell as being visited
	grid[row][column] = true;
	// Assemble randomly-ordered list of neighbors
	const neighbors = shuffle([
		[
			row - 1,
			column,
			'up'
		],
		[
			row,
			column + 1,
			'right'
		],
		[
			row + 1,
			column,
			'down'
		],
		[
			row,
			column - 1,
			'left'
		]
	]);

	// for each neighbor...
	for (let neighbor of neighbors) {
		const [
			nextRow,
			nextColumn,
			direction
		] = neighbor;

		// see if that neighbor is out of bounds
		if (nextRow < 0 || nextRow >= numberOfRows || nextColumn < 0 || nextColumn >= numberOfColumns) {
			// continue means skip the rest of the iteration of the for loop but go to the next iteration
			continue;
		}
		// if we have visited that neighbor, continue to next neighbor
		if (grid[nextRow][nextColumn]) {
			continue;
		}
		// remove a wall from either the horizontals or verticals array
		if (direction === 'left') {
			verticals[row][column - 1] = true;
		}
		else if (direction === 'right') {
			verticals[row][column] = true;
		}
		else if (direction === 'up') {
			horizontals[row - 1][column] = true;
		}
		else if (direction === 'down') {
			horizontals[row][column] = true;
		}

		// visit that next cell
		stepThroughCell(nextRow, nextColumn);
	}
};

stepThroughCell(...randomCell());

horizontals.forEach((row, rowIndex) => {
	row.forEach((open, columnIndex) => {
		if (open) {
			return;
		}
		const wall = Bodies.rectangle(
			(columnIndex + 0.5) * unitWidth,
			(rowIndex + 1) * unitHeight,
			unitWidth,
			wallThickness,
			{
				label    : 'wall',
				isStatic : true,
				render   : {
					fillStyle : 'red'
				}
			}
		);
		World.add(world, wall);
	});
});

verticals.forEach((row, rowIndex) => {
	row.forEach((open, columnIndex) => {
		if (open) {
			return;
		}
		const wall = Bodies.rectangle(
			(columnIndex + 1) * unitWidth,
			(rowIndex + 0.5) * unitHeight,
			wallThickness,
			unitHeight,
			{
				label    : 'wall',
				isStatic : true,
				render   : {
					fillStyle : 'red'
				}
			}
		);
		World.add(world, wall);
	});
});

// Goal
const goalLocation = randomCell();
const goal = Bodies.rectangle(
	(goalLocation[1] + 0.5) * unitWidth,
	(goalLocation[0] + 0.5) * unitHeight,
	unitWidth - wallThickness * 4,
	unitHeight - wallThickness * 4,
	{
		label    : 'goal',
		isStatic : true,
		render   : {
			fillStyle : 'green'
		}
	}
);
World.add(world, goal);

// Ball
const getBallLocation = () => {
	let location = randomCell();
	if (location[0] === goalLocation[0] && location[1] === goalLocation[1]) {
		while (location[0] === goalLocation[0] && location[1] === goalLocation[1]) {
			location = randomCell();
		}
	}
	return location;
};
const ballLocation = getBallLocation();
const ball = Bodies.circle(
	(ballLocation[1] + 0.5) * unitWidth,
	(ballLocation[0] + 0.5) * unitHeight,
	Math.min(unitHeight, unitWidth) / 2 - wallThickness * 4,
	{
		label    : 'player',
		isStatic : false,
		render   : {
			fillStyle : 'blue'
		}
	}
);
World.add(world, ball);

document.addEventListener('keydown', (event) => {
	const { x, y } = ball.velocity;
	if (event.key === 'w') {
		Body.setVelocity(ball, { x, y: y - unitHeight / 30 });
	}
	if (event.key === 'd') {
		Body.setVelocity(ball, { x: x + unitHeight / 30, y });
	}
	if (event.key === 's') {
		Body.setVelocity(ball, { x, y: y + unitHeight / 30 });
	}
	if (event.key === 'a') {
		Body.setVelocity(ball, { x: x - unitHeight / 30, y });
	}
});

// Win Condition
Events.on(engine, 'collisionStart', (event) => {
	event.pairs.forEach((collision) => {
		const labels = [
			'goal',
			'player'
		];
		if (labels.includes(collision.bodyA.label) && labels.includes(collision.bodyB.label)) {
			document.querySelector('.winner').classList.remove('hidden');
			world.gravity.y = 1;
			world.bodies.forEach((body) => {
				if (body.label === 'wall' || body.label === 'goal') {
					Body.setStatic(body, false);
				}
			});
		}
	});
});
