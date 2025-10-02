interface AppConfig {
  demoPath: string;
  outputDir: string;
  userId: string;
  rounds: string;
  selfRun: boolean;
}

let currentConfig: Partial<AppConfig> = {
  demoPath: undefined,
  outputDir: undefined,
  userId: undefined,
  rounds: "",
  selfRun: false
}

const REQUIRED_KEYS: Array<keyof AppConfig> = ['demoPath', 'outputDir', 'userId'];

function validateConfig(currentConfig: Partial<AppConfig>): asserts currentConfig is AppConfig {
  const missingKeys: Array<keyof AppConfig> = [];

  for (const key of REQUIRED_KEYS) {
    if (currentConfig[key] === undefined || currentConfig[key] === null || currentConfig[key] ===  "") {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Configuration Error: The following required keys are missing or undefined: ${missingKeys.join(', ')}`
    );
  }
}

export const getConfig = (): Readonly<AppConfig> => {
  validateConfig(currentConfig);

  return currentConfig as AppConfig;
};

function filterUndefinedValues<T extends Record<string, any>>(settings: T): Partial<T> {
  return Object.keys(settings).reduce((acc, key) => {
    const value = settings[key];
    if (value !== undefined && value !== null) {
      // Keep false, 0, "", or any other defined value
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

export const updateConfig = (newSettings: Partial<AppConfig>): void => {
  const definedSettings = filterUndefinedValues(newSettings);

  currentConfig = { ...currentConfig, ...definedSettings };
};
