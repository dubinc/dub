import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt']);

export const AccountScalarFieldEnumSchema = z.enum(['id','userId','type','provider','providerAccountId','refresh_token','refresh_token_expires_in','access_token','expires_at','token_type','scope','id_token','session_state']);

export const SessionScalarFieldEnumSchema = z.enum(['id','sessionToken','userId','expires']);

export const VerificationTokenScalarFieldEnumSchema = z.enum(['identifier','token','expires']);

export const TokenScalarFieldEnumSchema = z.enum(['id','name','hashedKey','partialKey','expires','lastUsed','createdAt','updatedAt','userId']);

export const ProjectScalarFieldEnumSchema = z.enum(['id','name','slug','logo','plan','stripeId','billingCycleStart','usage','usageLimit','linksUsage','linksLimit','domainsLimit','tagsLimit','usersLimit','monitoringId','createdAt','updatedAt','metadata']);

export const ProjectInviteScalarFieldEnumSchema = z.enum(['email','expires','projectId','createdAt']);

export const ProjectUsersScalarFieldEnumSchema = z.enum(['id','role','createdAt','updatedAt','userId','projectId']);

export const SentEmailScalarFieldEnumSchema = z.enum(['id','type','createdAt','projectId']);

export const DomainScalarFieldEnumSchema = z.enum(['id','slug','verified','target','type','placeholder','description','projectId','primary','archived','clicks','lastClicked','lastChecked','createdAt','updatedAt']);

export const LinkScalarFieldEnumSchema = z.enum(['id','domain','key','url','archived','expiresAt','password','proxy','title','description','image','utm_source','utm_medium','utm_campaign','utm_term','utm_content','rewrite','ios','android','geo','userId','projectId','publicStats','clicks','lastClicked','checkDisabled','createdAt','updatedAt','tagId','comments']);

export const TagScalarFieldEnumSchema = z.enum(['id','name','color','createdAt','updatedAt','projectId']);

export const Jackson_indexScalarFieldEnumSchema = z.enum(['id','key','storeKey']);

export const Jackson_storeScalarFieldEnumSchema = z.enum(['key','value','iv','tag','namespace','createdAt','modifiedAt']);

export const Jackson_ttlScalarFieldEnumSchema = z.enum(['key','expiresAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const NullsOrderSchema = z.enum(['first','last']);

export const UserOrderByRelevanceFieldEnumSchema = z.enum(['id','name','email','image']);

export const AccountOrderByRelevanceFieldEnumSchema = z.enum(['id','userId','type','provider','providerAccountId','refresh_token','access_token','token_type','scope','id_token','session_state']);

export const SessionOrderByRelevanceFieldEnumSchema = z.enum(['id','sessionToken','userId']);

export const VerificationTokenOrderByRelevanceFieldEnumSchema = z.enum(['identifier','token']);

export const TokenOrderByRelevanceFieldEnumSchema = z.enum(['id','name','hashedKey','partialKey','userId']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const ProjectOrderByRelevanceFieldEnumSchema = z.enum(['id','name','slug','logo','plan','stripeId','monitoringId']);

export const ProjectInviteOrderByRelevanceFieldEnumSchema = z.enum(['email','projectId']);

export const ProjectUsersOrderByRelevanceFieldEnumSchema = z.enum(['id','userId','projectId']);

export const SentEmailOrderByRelevanceFieldEnumSchema = z.enum(['id','type','projectId']);

export const DomainOrderByRelevanceFieldEnumSchema = z.enum(['id','slug','target','type','placeholder','description','projectId']);

export const LinkOrderByRelevanceFieldEnumSchema = z.enum(['id','domain','key','url','password','title','description','image','utm_source','utm_medium','utm_campaign','utm_term','utm_content','ios','android','userId','projectId','tagId','comments']);

export const TagOrderByRelevanceFieldEnumSchema = z.enum(['id','name','color','projectId']);

export const jackson_indexOrderByRelevanceFieldEnumSchema = z.enum(['key','storeKey']);

export const jackson_storeOrderByRelevanceFieldEnumSchema = z.enum(['key','value','iv','tag','namespace']);

export const jackson_ttlOrderByRelevanceFieldEnumSchema = z.enum(['key']);

export const RoleSchema = z.enum(['owner','member']);

export type RoleType = `${z.infer<typeof RoleSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.coerce.date().nullable(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().nullable(),
  refresh_token_expires_in: z.number().int().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().int().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string().cuid(),
  sessionToken: z.string(),
  userId: z.string(),
  expires: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// VERIFICATION TOKEN SCHEMA
/////////////////////////////////////////

export const VerificationTokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date(),
})

export type VerificationToken = z.infer<typeof VerificationTokenSchema>

/////////////////////////////////////////
// TOKEN SCHEMA
/////////////////////////////////////////

export const TokenSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  hashedKey: z.string(),
  partialKey: z.string(),
  expires: z.coerce.date().nullable(),
  lastUsed: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
})

export type Token = z.infer<typeof TokenSchema>

/////////////////////////////////////////
// PROJECT SCHEMA
/////////////////////////////////////////

export const ProjectSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  plan: z.string(),
  stripeId: z.string().nullable(),
  billingCycleStart: z.number().int(),
  usage: z.number().int(),
  usageLimit: z.number().int(),
  linksUsage: z.number().int(),
  linksLimit: z.number().int(),
  domainsLimit: z.number().int(),
  tagsLimit: z.number().int(),
  usersLimit: z.number().int(),
  monitoringId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: JsonValueSchema,
})

export type Project = z.infer<typeof ProjectSchema>

/////////////////////////////////////////
// PROJECT INVITE SCHEMA
/////////////////////////////////////////

export const ProjectInviteSchema = z.object({
  email: z.string(),
  expires: z.coerce.date(),
  projectId: z.string(),
  createdAt: z.coerce.date(),
})

export type ProjectInvite = z.infer<typeof ProjectInviteSchema>

/////////////////////////////////////////
// PROJECT USERS SCHEMA
/////////////////////////////////////////

export const ProjectUsersSchema = z.object({
  role: RoleSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  projectId: z.string(),
})

export type ProjectUsers = z.infer<typeof ProjectUsersSchema>

/////////////////////////////////////////
// SENT EMAIL SCHEMA
/////////////////////////////////////////

export const SentEmailSchema = z.object({
  id: z.string().cuid(),
  type: z.string(),
  createdAt: z.coerce.date(),
  projectId: z.string().nullable(),
})

export type SentEmail = z.infer<typeof SentEmailSchema>

/////////////////////////////////////////
// DOMAIN SCHEMA
/////////////////////////////////////////

export const DomainSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  verified: z.boolean(),
  target: z.string().nullable(),
  type: z.string(),
  placeholder: z.string(),
  description: z.string().nullable(),
  projectId: z.string().nullable(),
  primary: z.boolean(),
  archived: z.boolean(),
  clicks: z.number().int(),
  lastClicked: z.coerce.date().nullable(),
  lastChecked: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Domain = z.infer<typeof DomainSchema>

/////////////////////////////////////////
// LINK SCHEMA
/////////////////////////////////////////

export const LinkSchema = z.object({
  id: z.string().cuid(),
  domain: z.string(),
  key: z.string(),
  url: z.string(),
  archived: z.boolean(),
  expiresAt: z.coerce.date().nullable(),
  password: z.string().nullable(),
  proxy: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  utm_term: z.string().nullable(),
  utm_content: z.string().nullable(),
  rewrite: z.boolean(),
  ios: z.string().nullable(),
  android: z.string().nullable(),
  geo: JsonValueSchema,
  userId: z.string().nullable(),
  projectId: z.string().nullable(),
  publicStats: z.boolean(),
  clicks: z.number().int(),
  lastClicked: z.coerce.date().nullable(),
  checkDisabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tagId: z.string().nullable(),
  comments: z.string().nullable(),
})

export type Link = z.infer<typeof LinkSchema>

/////////////////////////////////////////
// TAG SCHEMA
/////////////////////////////////////////

export const TagSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  color: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  projectId: z.string(),
})

export type Tag = z.infer<typeof TagSchema>

/////////////////////////////////////////
// JACKSON INDEX SCHEMA
/////////////////////////////////////////

export const jackson_indexSchema = z.object({
  id: z.number().int(),
  key: z.string(),
  storeKey: z.string(),
})

export type jackson_index = z.infer<typeof jackson_indexSchema>

/////////////////////////////////////////
// JACKSON STORE SCHEMA
/////////////////////////////////////////

export const jackson_storeSchema = z.object({
  key: z.string(),
  value: z.string(),
  iv: z.string().nullable(),
  tag: z.string().nullable(),
  namespace: z.string().nullable(),
  createdAt: z.coerce.date(),
  modifiedAt: z.coerce.date().nullable(),
})

export type jackson_store = z.infer<typeof jackson_storeSchema>

/////////////////////////////////////////
// JACKSON TTL SCHEMA
/////////////////////////////////////////

export const jackson_ttlSchema = z.object({
  key: z.string(),
  expiresAt: z.bigint(),
})

export type jackson_ttl = z.infer<typeof jackson_ttlSchema>
