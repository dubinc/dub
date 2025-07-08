import Mixpanel from "mixpanel";

// interface
interface ITrackParams {
  eventName: string;
  props?: any;
}

interface IPeopleSetParams {
  distinct_id: string;
  props: any;
}

interface IIdentifyParams {
  distinct_id: string;
  props?: any;
}

// mixpanel server service
class MixpanelServerService {
  private mixpanel: Mixpanel.Mixpanel;

  constructor() {
    if (!process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN) {
      throw new Error("NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN environment variable is required");
    }

    this.mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN, {
      debug: process.env.NODE_ENV !== "production",
      // You can add other server-side specific options here
    });
  }

  // Track events
  track(params: ITrackParams & { distinct_id: string }) {
    const { eventName, distinct_id, props } = params;
    
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.track(eventName, {
        distinct_id,
        ...props,
      }, (err) => {
        if (err) {
          console.error("Mixpanel track error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Set people properties (creates or updates)
  peopleSet(params: IPeopleSetParams) {
    const { distinct_id, props } = params;
    
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.people.set(distinct_id, props, (err) => {
        if (err) {
          console.error("Mixpanel people.set error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Set people properties only once (only sets if property doesn't already exist)
  peopleSetOnce(params: IPeopleSetParams) {
    const { distinct_id, props } = params;
    
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.people.set_once(distinct_id, props, (err) => {
        if (err) {
          console.error("Mixpanel people.set_once error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Identify a user (alias a user to a new distinct_id)
  identify(params: IIdentifyParams) {
    const { distinct_id, props } = params;
    
    if (props) {
      // If we have properties to set, use people.set
      return this.peopleSet({ distinct_id, props });
    }
    
    // If no properties, just return resolved promise as server-side identify
    // is typically handled differently than client-side
    return Promise.resolve();
  }

  // Increment a numeric property
  peopleIncrement(distinct_id: string, prop: string, value: number = 1) {
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.people.increment(distinct_id, prop, value, (err) => {
        if (err) {
          console.error("Mixpanel people.increment error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Add items to a list property
  peopleUnionList(distinct_id: string, prop: string, values: any[]) {
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.people.union(distinct_id, { [prop]: values }, (err) => {
        if (err) {
          console.error("Mixpanel people.union error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Create an alias for a user
  createAlias(distinct_id: string, alias: string) {
    return new Promise<void>((resolve, reject) => {
      this.mixpanel.alias(distinct_id, alias, (err) => {
        if (err) {
          console.error("Mixpanel alias error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

const mixpanelServer = new MixpanelServerService();

export default mixpanelServer; 