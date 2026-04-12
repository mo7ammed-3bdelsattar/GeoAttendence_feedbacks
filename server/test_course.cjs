const axios = require('axios');

async function testCreateCourse() {
  try {
    const res = await axios.post('http://127.0.0.1:5000/api/admin/courses', {
      name: "Test Course",
      code: "TST101",
      day: "Monday",
      startTime: "10:00 AM",
      endTime: "11:00 AM"
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testCreateCourse();
