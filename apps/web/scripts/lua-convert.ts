import { redis } from "@/lib/upstash";
import "dotenv-flow/config";

async function main() {
  const script = `
local list_key = KEYS[1]
local sorted_set_key = KEYS[2]

local list_length = 50

local output = {}

for i = 1, list_length do
    local json_item = redis.call('LINDEX', list_key, i - 1)

    table.insert(output, json_item)
end

return output`;

  const response = await redis.eval(script, ["metatags, metatags-set"], []);

  console.log(response);
}

main();
