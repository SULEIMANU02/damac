const axios = require('axios');


async function fetchMtn() {
    const apiUrl = 'https://damacsub.com/botpanel/plans.php';
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log('Data fetched from PHP:', data);
        return data

        // Process or use the data as needed
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

const mtnPlans = async () => {
  try {
      const documents = await fetchMtn(); // Fetch the data (an array of objects)

      // Sort the documents by the 'index' key in ascending order
      documents.sort((a, b) => a.index - b.index);

      // Extract the 'name' and 'type' keys from the sorted documents
      let menuString = '*📲Buy MTN DATA📱*\n\n';
      menuString += 'Please select your *Data Type*\n\n';
      menuString += 'Reply with menu number\n\n';

      // Loop through the array to build the numbered menu
      documents.forEach((doc, index) => {
          menuString += `\t*${index + 1}. MTN ${doc.type} ${doc.name + ' ' + '₦' + doc.userprice}*\n\n`;
      });

      menuString += '\n*Note*: Reply with #️⃣ to go back to the main menu';
      console.log('plans', menuString);
      return menuString;
  } catch (error) {
      console.error('Error fetching MTN plans:', error);
  }
};

async function fetchAirtel() {
    const apiUrl = 'https://damacsub.com/botpanel/airtel.php';
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log('Data fetched from PHP:', data);
        return data

        // Process or use the data as needed
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

const airtelPlans = async () => {
  try {
      const documents = await fetchAirtel(); 

      // Sort the documents by the 'index' key in ascending order
      documents.sort((a, b) => a.index - b.index);

      // Extract the 'name' and 'type' keys from the sorted documents
      let menuString = '*📲Buy Airtel DATA📱*\n\n';
      menuString += 'Please select your *Data Type*\n\n';
      menuString += 'Reply with menu number\n\n';

      // Loop through the array to build the numbered menu
      documents.forEach((doc, index) => {
          menuString += `\t*${index + 1}. Airtel ${doc.type} ${doc.name + ' ' + '₦' + doc.userprice}*\n\n`;
      });

      menuString += '\n*Note*: Reply with #️⃣ to go back to the main menu';
      console.log('plans', menuString);
      return menuString;
  } catch (error) {
      console.error('Error fetching MTN plans:', error);
  }
};

async function fetchGlo() {
    const apiUrl = 'https://damacsub.com/botpanel/glo.php';
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log('Data fetched from PHP:', data);
        return data

        // Process or use the data as needed
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

const gloPlans = async () => {
  try {
      const documents = await fetchMtn(); // Fetch the data (an array of objects)

      // Sort the documents by the 'index' key in ascending order
      documents.sort((a, b) => a.index - b.index);

      // Extract the 'name' and 'type' keys from the sorted documents
      let menuString = '*📲Buy GLO DATA📱*\n\n';
      menuString += 'Please select your *Data Type*\n\n';
      menuString += 'Reply with menu number\n\n';

      // Loop through the array to build the numbered menu
      documents.forEach((doc, index) => {
          menuString += `\t*${index + 1}. GLO ${doc.type} ${doc.name + ' ' + '₦' + doc.userprice}*\n\n`;
      });

      menuString += '\n*Note*: Reply with #️⃣ to go back to the main menu';
      console.log('plans', menuString);
      return menuString;
  } catch (error) {
      console.error('Error fetching MTN plans:', error);
  }
};

async function fetchMobile() {
    const apiUrl = 'https://damacsub.com/botpanel/9mobile.php';
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log('Data fetched from PHP:', data);
        return data

        // Process or use the data as needed
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

const mobilePlans = async () => {
  try {
      const documents = await fetchMtn(); // Fetch the data (an array of objects)

      // Sort the documents by the 'index' key in ascending order
      documents.sort((a, b) => a.index - b.index);

      // Extract the 'name' and 'type' keys from the sorted documents
      let menuString = '*📲Buy 9MOBILE DATA📱*\n\n';
      menuString += 'Please select your *Data Type*\n\n';
      menuString += 'Reply with menu number\n\n';

      // Loop through the array to build the numbered menu
      documents.forEach((doc, index) => {
          menuString += `\t*${index + 1}. 9MOBILE ${doc.type} ${doc.name + ' ' + '₦' + doc.userprice}*\n\n`;
      });

      menuString += '\n*Note*: Reply with #️⃣ to go back to the main menu';
      console.log('plans', menuString);
      return menuString;
  } catch (error) {
      console.error('Error fetching MTN plans:', error);
  }
};


module.exports = {
    fetchMtn, mtnPlans, fetchAirtel, airtelPlans, fetchGlo, gloPlans, fetchMobile, mobilePlans,
}