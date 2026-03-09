const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Doctor = require('../backend/src/models/Doctor');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const doctors = await Doctor.find({});
        console.log('Total Doctors:', doctors.length);
        doctors.forEach(d => {
            console.log(`- ${d.name} (${d.doctor_id}) - is_active: ${d.is_active}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
