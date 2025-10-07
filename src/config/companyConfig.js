// src/config/companyConfig.js
export const COMPANY_CONFIG = {
  name: "SOHEL CHICKEN CENTRE",
  shortName: "SOHEL",
  address: "Madha, Solapur, Maharashtra-413209",
  contactNumber: "+91 8605030099",
  email: "contact@sohelchickencentre.com",
  website: "www.sohelchickencentre.com"
};

// You can also create different configurations for different environments
export const getCompanyConfig = () => {
  // You can add logic here to load from environment variables or API
  // For now, return the default config
  return COMPANY_CONFIG;
};
