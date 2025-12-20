const express = require("express");
const app = express();

app.use(express.static("public"));  // Serve static files
app.listen(3000, () => console.log("http://localhost:3000"));