import { debugUtil } from "../../util";
import { ICustomerBody } from "../payment/config";
import { EAnalyticEvents } from "./interfaces/analytic.interface";
import { mixpanelServer } from "./mixpanel";

// interface
interface TrackServerEventsParams<T> {
  event: EAnalyticEvents;
  distinct_id: string;
  user?: ICustomerBody | null;
  params?: T;
}

interface SetPeopleAnalyticParams {
  distinct_id: string;
  props: any;
}

// track server events service
export const trackServerEvents = async <T extends Record<string, any>>(
  props: TrackServerEventsParams<T>,
) => {
  const { event, distinct_id, user, params } = props;

  const values = {
    env: `${process.env.NODE_ENV}`,
    distinct_id,
    ...params,
  };

  try {
    debugUtil({ text: `Server Event - ${event}`, value: values });

    await mixpanelServer.track({
      eventName: event,
      distinct_id,
      props: values,
    });

    console.log(`Successfully tracked server event: ${event}`);
  } catch (error) {
    console.error(`Failed to track server event ${event}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// set people properties on server
export const setPeopleAnalyticServer = async (params: SetPeopleAnalyticParams) => {
  const { distinct_id, props } = params;

  try {
    await mixpanelServer.peopleSet({
      distinct_id,
      props,
    });

    console.log(`Successfully set people properties for ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to set people properties for ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// set people properties only once on server
export const setPeopleAnalyticOnceServer = async (params: SetPeopleAnalyticParams) => {
  const { distinct_id, props } = params;

  try {
    await mixpanelServer.peopleSetOnce({
      distinct_id,
      props,
    });

    console.log(`Successfully set people properties once for ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to set people properties once for ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// identify user on server
export const identifyUserServer = async (params: SetPeopleAnalyticParams) => {
  const { distinct_id, props } = params;

  try {
    await mixpanelServer.identify({
      distinct_id,
      props,
    });

    console.log(`Successfully identified user ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to identify user ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// increment a numeric property
export const incrementPeoplePropertyServer = async (
  distinct_id: string, 
  property: string, 
  value: number = 1
) => {
  try {
    await mixpanelServer.peopleIncrement(distinct_id, property, value);
    console.log(`Successfully incremented ${property} for ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to increment ${property} for ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// add items to a list property
export const addToListPropertyServer = async (
  distinct_id: string, 
  property: string, 
  values: any[]
) => {
  try {
    await mixpanelServer.peopleUnionList(distinct_id, property, values);
    console.log(`Successfully added to list ${property} for ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to add to list ${property} for ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
};

// create alias for user
export const createUserAliasServer = async (distinct_id: string, alias: string) => {
  try {
    await mixpanelServer.createAlias(distinct_id, alias);
    console.log(`Successfully created alias ${alias} for ${distinct_id}`);
  } catch (error) {
    console.error(`Failed to create alias ${alias} for ${distinct_id}:`, error);
    // Don't throw error to avoid breaking the main flow
  }
}; 