export function useReward() {
  return { reward: (type: string, id: string) => console.log("Reward:", type, id) };
}
