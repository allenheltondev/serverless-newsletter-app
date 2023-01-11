exports.handler = async (state) => {
  const today = new Date().getTime();
  const slot = state.schedule.find(s => {
      const scheduleDate = new Date(s.date).getTime();
      const dateDiff = (scheduleDate - today) / (1000 * 3600 * 24);
      return dateDiff > 0 && dateDiff < 7;
  });
  
  if(slot?.sponsor){
      return { slot }
  }
};