export interface OTAChannelItem {
  id: number;
  name: string;
  code: string;
  channel_type: string;
  api_type: string;
  commission_percent: number;
  is_active: boolean;
  logo_url: string;
  hotel_id_on_ota: string;
  is_connected: boolean;
  connection_mode: string;
  connection_status: string;
  last_connection_test: string;
  rate_plan?: string;
  auto_confirm?: boolean;
}

export let initialOtaChannels: OTAChannelItem[] = [
  { id: 1, name: "Self Hotel Website (Direct)", code: "WEB", channel_type: "Direct Website", api_type: "REST", commission_percent: 0.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-WEB-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "BAR", auto_confirm: true },
  { id: 2, name: "Booking.com Global", code: "BDC", channel_type: "Global OTA", api_type: "XML", commission_percent: 18.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-BDC-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Dynamic Genius", auto_confirm: true },
  { id: 3, name: "MakeMyTrip India", code: "MMT", channel_type: "Indian OTA", api_type: "REST", commission_percent: 15.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=100", hotel_id_on_ota: "HOTEL-MMT-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Standard MMT", auto_confirm: true },
  { id: 4, name: "Goibibo Portal", code: "GOI", channel_type: "Indian OTA", api_type: "REST", commission_percent: 15.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=100", hotel_id_on_ota: "HOTEL-GOI-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Goibibo Flex", auto_confirm: true },
  { id: 5, name: "Agoda International", code: "AGD", channel_type: "Asian OTA", api_type: "REST", commission_percent: 16.5, is_active: true, logo_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=100", hotel_id_on_ota: "HOTEL-AGD-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Package Rate", auto_confirm: true },
  { id: 6, name: "Expedia Group", code: "EXP", channel_type: "Global OTA", api_type: "XML", commission_percent: 17.5, is_active: true, logo_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=100", hotel_id_on_ota: "HOTEL-EXP-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Expedia Value", auto_confirm: true },
  { id: 7, name: "Airbnb Experiences & Stays", code: "AIR", channel_type: "Vacation Rental", api_type: "REST", commission_percent: 14.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=100", hotel_id_on_ota: "HOTEL-AIR-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Superhost Rate", auto_confirm: true },
  { id: 8, name: "Yatra.com India", code: "YTR", channel_type: "Indian OTA", api_type: "REST", commission_percent: 15.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-YTR-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Yatra Saver", auto_confirm: true },
  { id: 9, name: "ClearTrip Flights & Hotels", code: "CLT", channel_type: "Indian OTA", api_type: "REST", commission_percent: 14.5, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=100", hotel_id_on_ota: "HOTEL-CLT-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "ClearTrip Flexi", auto_confirm: true },
  { id: 10, name: "EaseMyTrip Portal", code: "EMT", channel_type: "Indian OTA", api_type: "REST", commission_percent: 14.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=100", hotel_id_on_ota: "HOTEL-EMT-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "EMT Zero Fee", auto_confirm: true },
  { id: 11, name: "Trip.com / Ctrip Global", code: "CTP", channel_type: "Global OTA", api_type: "REST", commission_percent: 16.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=100", hotel_id_on_ota: "HOTEL-CTP-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Global Ctrip", auto_confirm: true },
  { id: 12, name: "Google Hotel Ads Direct", code: "GHA", channel_type: "Meta Engine", api_type: "REST", commission_percent: 0.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-GHA-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Direct Feed", auto_confirm: true },
  { id: 13, name: "TripAdvisor Instant Booking", code: "TADV", channel_type: "Meta Engine", api_type: "REST", commission_percent: 12.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=100", hotel_id_on_ota: "HOTEL-TADV-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "TripAdvisor Connect", auto_confirm: true },
  { id: 14, name: "Hostelworld Global", code: "HSW", channel_type: "Global OTA", api_type: "REST", commission_percent: 15.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=100", hotel_id_on_ota: "HOTEL-HSW-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Hostel Standard", auto_confirm: true },
  { id: 15, name: "HotelTonight Last-Minute", code: "HTN", channel_type: "Last-Minute OTA", api_type: "REST", commission_percent: 18.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=100", hotel_id_on_ota: "HOTEL-HTN-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Last Minute Deals", auto_confirm: true },
  { id: 16, name: "Viator / TripAdvisor Experiences", code: "VTR", channel_type: "Tours & Experiences", api_type: "REST", commission_percent: 20.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-VTR-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Experience Pkg", auto_confirm: true },
  { id: 17, name: "Klook Travel Experiences", code: "KLK", channel_type: "Asian OTA", api_type: "REST", commission_percent: 18.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=100", hotel_id_on_ota: "HOTEL-KLK-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Klook Pass", auto_confirm: true },
  { id: 18, name: "Traveloka SE Asia", code: "TVL", channel_type: "Asian OTA", api_type: "REST", commission_percent: 15.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=100", hotel_id_on_ota: "HOTEL-TVL-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "SEA Flex", auto_confirm: true },
  { id: 19, name: "VRBO / HomeAway", code: "VRBO", channel_type: "Vacation Rental", api_type: "REST", commission_percent: 12.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=100", hotel_id_on_ota: "HOTEL-VRBO-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "VRBO Direct", auto_confirm: true },
  { id: 20, name: "Corporate B2B Direct Partner", code: "B2B", channel_type: "Corporate B2B", api_type: "REST", commission_percent: 5.0, is_active: true, logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100", hotel_id_on_ota: "HOTEL-B2B-88192", is_connected: true, connection_mode: "LIVE", connection_status: "Configured & Active", last_connection_test: new Date().toISOString(), rate_plan: "Corporate Flat Rate", auto_confirm: true }
];

export let roomMappings = [
  { id: 1, pms_room_type: "Deluxe Heritage Room", pms_room_code: "DHR", ota_name: "Booking.com Global", ota_code: "BDC", ota_room_type_code: "BDC_DELUXE_01", ota_room_type_name: "Deluxe Heritage Room", is_active: true },
  { id: 2, pms_room_type: "Royal Heritage Suite", pms_room_code: "RHS", ota_name: "Booking.com Global", ota_code: "BDC", ota_room_type_code: "BDC_SUITE_02", ota_room_type_name: "Royal Heritage Suite", is_active: true },
  { id: 3, pms_room_type: "Deluxe Heritage Room", pms_room_code: "DHR", ota_name: "MakeMyTrip India", ota_code: "MMT", ota_room_type_code: "MMT_DHR_101", ota_room_type_name: "Deluxe Heritage Room", is_active: true },
  { id: 4, pms_room_type: "Royal Heritage Suite", pms_room_code: "RHS", ota_name: "MakeMyTrip India", ota_code: "MMT", ota_room_type_code: "MMT_RHS_202", ota_room_type_name: "Royal Heritage Suite", is_active: true }
];

export let rateMappings = [
  { id: 1, pms_rate_plan: "Best Available Rate (BAR)", pms_rate_code: "BAR", ota_name: "Booking.com Global", ota_code: "BDC", ota_rate_plan_code: "BDC_BAR_STD", ota_rate_plan_name: "BAR Plan", is_active: true },
  { id: 2, pms_rate_plan: "Best Available Rate (BAR)", pms_rate_code: "BAR", ota_name: "MakeMyTrip India", ota_code: "MMT", ota_rate_plan_code: "MMT_BAR_FLEX", ota_rate_plan_name: "Flexible BAR Rate", is_active: true }
];

export let auditLogs = [
  { id: 1, username: "Super-Admin Console", action: "ONE_CLICK_SYNC", entity_type: "SyncJob", entity_id: "1", old_value: null, new_value: { channels_synced: 20 }, ip_address: "127.0.0.1", created_at: new Date().toISOString() },
  { id: 2, username: "Maharani Gayatri Devi", action: "OTA_CHANNEL_CREATE", entity_type: "OtaChannel", entity_id: "20", old_value: null, new_value: { name: "Corporate B2B Direct Partner", code: "B2B" }, ip_address: "127.0.0.1", created_at: new Date(Date.now() - 3600000).toISOString() }
];
