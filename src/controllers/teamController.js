import { Team } from '../models/Team.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getTeam = async (req, res, next) => {
  try {
    const members = await Team.find().lean();
    return res.status(200).json(new ApiResponse(200, members, 'Team members retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createTeamMember = async (req, res, next) => {
  try {
    const member = await Team.create(req.body);
    return res.status(201).json(new ApiResponse(201, member, 'Team member created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Team.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return next(new ApiError(404, 'Team member not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Team member updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Team.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Team member deleted successfully'));
  } catch (error) {
    next(error);
  }
};
