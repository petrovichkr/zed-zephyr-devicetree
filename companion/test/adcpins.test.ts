// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { esp32AdcPins } from "../src/ui/model.js";

describe("esp32AdcPins", () => {
  const ws = mkdtempSync(join(tmpdir(), "adc-"));
  afterAll(() => rmSync(ws, { recursive: true, force: true }));
  const soc = join(ws, "modules", "hal", "espressif", "components", "soc", "esp32p4", "include", "soc");
  mkdirSync(soc, { recursive: true });
  mkdirSync(join(ws, "zephyr", "include"), { recursive: true });
  writeFileSync(join(soc, "adc_channel.h"), "#define ADC1_GPIO16_CHANNEL 0\n#define ADC1_CHANNEL_0_GPIO_NUM 16\n#define ADC2_CHANNEL_5_GPIO_NUM 54\n");

  it("reads the channel map of the board's SoC from the HAL found above an include path", () => {
    expect(esp32AdcPins("/x/zephyr/dt-bindings/pinctrl/esp32p4-pinctrl.h", [join(ws, "zephyr", "include")])).toEqual({ "1:0": "GPIO16", "2:5": "GPIO54" });
    expect(esp32AdcPins("/x/esp32s3-pinctrl.h", [join(ws, "zephyr", "include")])).toBeUndefined();
    expect(esp32AdcPins(undefined, [ws])).toBeUndefined();
  });
});
