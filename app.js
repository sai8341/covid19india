const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let db = null;

const convertStatesDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjcetToResponse = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// GET API Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const statesQuery = `
    SELECT
        *
    FROM
        state
    `;
  const statesArray = await db.all(statesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStatesDbObjectToResponseObject(eachState)
    )
  );
});

// GET API returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetails = `
  SELECT
    *
  FROM 
    state
  WHERE 
    state_id = ${stateId};
  `;

  const singleState = await db.get(stateDetails);
  response.send(convertStatesDbObjectToResponseObject(singleState));
});

// POST API Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDetailsQuery = `
  INSERT INTO
    district (district_name, state_id, cases, cured, active, deaths)
  VALUES
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})
  `;
  await db.run(createDetailsQuery);
  response.send("District Successfully Added");
});

// GET API Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
    SELECT
        *
    FROM
        district
    WHERE
        district_id = ${districtId};
    `;
  const district = await db.get(districtDetails);
  response.send(convertDistrictDbObjcetToResponse(district));
});

// DELETE API Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM
        district
    WHERE 
        district_id = ${districtId};
    `;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

// PUT API Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updatingQuery = `
  UPDATE 
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths};

  WHERE 
    district_id = ${districtId};
  `;
  await db.run(updatingQuery);
  response.send("District Details Updated");
});

// GET API Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

// GET API Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const stats = await db.get(getStateStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

module.exports = app;
