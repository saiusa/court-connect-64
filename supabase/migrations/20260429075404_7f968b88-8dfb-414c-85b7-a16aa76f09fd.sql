-- Fix linter: set search_path on functions and revoke public execute
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Seed sample facilities (no owner — public discovery)
INSERT INTO public.facilities (name, sport_type, location, description, image_url, hourly_price, open_hour, close_hour) VALUES
('Downtown Hoops Arena', 'Basketball', 'Downtown · Main St 12', 'Premium indoor basketball court with hardwood flooring and professional lighting.', '/src/assets/basketball.jpg', 25, 8, 22),
('Smash Badminton Center', 'Badminton', 'Eastside · Park Ave 34', 'Six wooden badminton courts with proper net height and bright LED lighting.', '/src/assets/badminton.jpg', 15, 7, 23),
('Iron Forge Gym', 'Gym', 'Westside · Oak Rd 88', 'Fully equipped strength gym with free weights, racks, and cardio zone.', '/src/assets/gym.jpg', 12, 6, 23),
('Greenfield Soccer Pitch', 'Soccer', 'Northside · Stadium Way 1', 'Full-size turf pitch with stadium lighting for evening matches.', '/src/assets/soccer.jpg', 60, 9, 23),
('Centre Court Tennis Club', 'Tennis', 'Riverside · Lake Dr 7', 'Indoor hard court tennis with climate control year-round.', '/src/assets/tennis.jpg', 30, 8, 22),
('Skyline Rooftop Court', 'Basketball', 'Uptown · Tower Plaza', 'Outdoor rooftop basketball court with city skyline views.', '/src/assets/hero.jpg', 20, 10, 22);