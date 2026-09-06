export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window)) return;
  
  // Only show notification if permission is granted and the user is NOT actively looking at the page
  if (Notification.permission === "granted" && document.visibilityState === 'hidden') {
    const notification = new Notification(title, {
      icon: '/icon.png', // Assuming there's a favicon or we can just leave it default
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
