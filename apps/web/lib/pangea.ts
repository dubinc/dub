import { PangeaConfig, URLIntelService, DomainIntelService, PangeaErrors } from "pangea-node-sdk";

const config = new PangeaConfig({ domain: process.env.PANGEA_DOMAIN });
const domainIntel = new DomainIntelService(String(process.env.PANGEA_TOKEN), config);
const urlIntel = new URLIntelService(String(process.env.PANGEA_TOKEN), config);

const getPangeaURLIntel = async (url: string) => {
    try {
        const scanOptions = { provider: "crowdstrike", verbose: false, raw: true };
        const response = await urlIntel.reputation(url, scanOptions);

        return response.result.data.verdict;
        
    } catch (e) {
        if (e instanceof PangeaErrors.APIError) {
          console.log("Error", e.summary, e.errors);
        } else {
          console.log("Error: ", e);
        }

        return null;
    } 
}

const getPangeaDomainIntel = async (domain: string) => {
    try {
        const options = { provider: "domaintools", verbose: false, raw: true };
        const response = await domainIntel.reputation(domain, options);

        return response.result.data.verdict;
    } catch (e) {
        if (e instanceof PangeaErrors.APIError) {
          console.log("Error", e.summary, e.errors);
        } else {
          console.log("Error: ", e);
        }
        
        return null;
    }
}

export { getPangeaURLIntel,  getPangeaDomainIntel }