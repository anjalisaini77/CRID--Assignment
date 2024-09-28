const express = require('express');
const router = express.Router({ mergeParams: true });
const mysqlConnection = require('../database');
const verify = require("../verifyToken");
const verifyrest = require("../verifyTokenRest");

// Helper function to perform queries with async/await
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

// Update using form
router.post("/update", verify, async (req, res) => {
    try {
        await queryAsync(
            "UPDATE employee SET Name = ?, EmpCode = ?, Salary = ? WHERE EMPID = ?",
            [req.body.Name, req.body.EmpCode, req.body.Salary, req.params.id]
        );
        res.redirect("/view");
    } catch (err) {
        console.error("Error updating employee:", err);
        res.redirect('/view?error=' + encodeURIComponent("Internal Server Error"));
    }
});

// Update using endpoint API
router.patch("/update", verifyrest, async (req, res) => {
    try {
        const result = await queryAsync(
            "UPDATE employee SET Name = ?, EmpCode = ?, Salary = ? WHERE EMPID = ?",
            [req.body.Name, req.body.EmpCode, req.body.Salary, req.params.id]
        );
        res.json(result);
    } catch (err) {
        console.error("Error updating employee:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Delete using form
router.get("/delete", verify, async (req, res) => {
    try {
        await queryAsync("DELETE FROM employee WHERE EmpID = ?", [req.params.id]);
        res.redirect("/view");
    } catch (err) {
        console.error("Error deleting employee:", err);
        res.redirect('/view?error=' + encodeURIComponent("Internal Server Error"));
    }
});

// Delete using endpoint API
router.delete("/delete", verifyrest, async (req, res) => {
    try {
        const result = await queryAsync("DELETE FROM employee WHERE EmpID = ?", [req.params.id]);
        res.json(result);
    } catch (err) {
        console.error("Error deleting employee:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;