const express = require('express');
const router = express.Router();
const mysqlConnection = require('../database');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verify = require('../verifyToken');
const verifyrest = require('../verifyTokenRest');
const { registerValidation, loginValidation } = require('../validation');

// Helper function to query the database with async/await
const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    mysqlConnection.query(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

//authview
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../auth.html'));
});

//Signup using form
router.post("/signup", async (req, res) => {
  try {
    const { error } = registerValidation(req.body);
    if (error) return res.redirect('/?error=' + encodeURIComponent(error.details[0].message));

    const rows = await queryAsync("SELECT * FROM user WHERE email = ?", [req.body.Email]);
    if (rows.length) return res.redirect('/?error=' + encodeURIComponent('Email already exists!'));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.Password, salt);

    await queryAsync("INSERT INTO user (email, password) VALUES (?,?)", [req.body.Email, hashedPassword]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect('/?error=' + encodeURIComponent('Internal Server Error'));
  }
});

//Signup using end-point API
router.post("/restsignup", async (req, res) => {
  try {
    const { error } = registerValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const rows = await queryAsync("SELECT * FROM user WHERE email = ?", [req.body.Email]);
    if (rows.length) return res.status(400).send('Email already exists!');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.Password, salt);

    const result = await queryAsync("INSERT INTO user (email, password) VALUES (?,?)", [req.body.Email, hashedPassword]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

//Login using form
router.post("/login", async (req, res) => {
  try {
    const { error } = loginValidation(req.body);
    if (error) return res.redirect('/?error=' + encodeURIComponent(error.details[0].message));

    const rows = await queryAsync("SELECT * FROM user WHERE email = ?", [req.body.Email]);
    if (!rows.length) return res.redirect('/?error=' + encodeURIComponent('Email does not exist'));

    const user = rows[0];
    const validPass = await bcrypt.compare(req.body.Password, user.password);
    if (!validPass) return res.redirect('/?error=' + encodeURIComponent('Invalid Password'));

    const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET, { expiresIn: "10h" });
    res.cookie('auth-token', token, { maxAge: 360000, httpOnly: true });
    res.redirect('/view');
  } catch (err) {
    console.error(err);
    res.redirect('/?error=' + encodeURIComponent('Internal Server Error'));
  }
});

//Login using end-point API
router.post("/restlogin", async (req, res) => {
  try {
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const rows = await queryAsync("SELECT * FROM user WHERE email = ?", [req.body.Email]);
    if (!rows.length) return res.status(400).send('Email does not exist');

    const user = rows[0];
    const validPass = await bcrypt.compare(req.body.Password, user.password);
    if (!validPass) return res.status(400).send('Invalid password');

    const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET, { expiresIn: "10h" });
    res.header('auth-token', token).send(token);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

//Fetch using form
router.get("/view", verify, async (req, res) => {
  try {
    const rows = await queryAsync("SELECT * FROM employee");
    res.render(path.join(__dirname, '../view.html'), { data: rows });
  } catch (err) {
    console.error(err);
    res.redirect('/?error=' + encodeURIComponent('Internal Server Error'));
  }
});

//Fetch using endpoint API
router.get("/restview", verifyrest, async (req, res) => {
  try {
    const rows = await queryAsync("SELECT * FROM employee");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

//Insert using form
router.post("/create", verify, async (req, res) => {
  try {
    await queryAsync("INSERT INTO employee (Name, EmpCode, Salary) VALUES (?,?,?)", [req.body.Name, req.body.EmpCode, req.body.Salary]);
    res.redirect("/view");
  } catch (err) {
    console.error(err);
    res.redirect('/?error=' + encodeURIComponent('Internal Server Error'));
  }
});

//Insert using end-point API
router.post("/restcreate", verifyrest, async (req, res) => {
  try {
    const result = await queryAsync("INSERT INTO employee (Name, EmpCode, Salary) VALUES (?,?,?)", [req.body.Name, req.body.EmpCode, req.body.Salary]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

//Logout for form
router.post("/logout", verify, (req, res) => {
  res.clearCookie('auth-token');
  res.json({ loggedout: "logged out" });
});

module.exports = router;
