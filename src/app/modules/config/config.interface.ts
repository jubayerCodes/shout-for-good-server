export enum IntervalEnum {
  week = "week",
  month = "month",
  year = "year",
}

export interface IConfig {
  donationAmounts: number[];
  recurringOptions: {
    interval: IntervalEnum;
    intervalCount: number;
    label: string;
  }[];
}
